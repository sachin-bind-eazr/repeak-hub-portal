"use client";

import { ArrowUp, Copy, RefreshCw, RotateCcw, Sparkles, Square, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { clearSession, getStoredToken, isAuthenticated } from "@/lib/auth";
import { loadAiConversation, saveAiConversation, setActiveAiThread, type StoredAiAction, type StoredAiMessage } from "@/lib/repeak-ai-store";
import { listWorkspaces, type Workspace } from "@/lib/workspaces";
import SafeMarkdown from "./SafeMarkdown";
import styles from "./RepeakAiAssistant.module.css";

type Portal = "ORGANIZER" | "BRAND" | "CLUB";
type Message = StoredAiMessage & { failed?: boolean };
type AssistantReply = { text: string; actions?: unknown[] };

const PORTALS: Record<Portal, { platform: "organizer" | "brand" | "club"; origin: string; label: string }> = {
  ORGANIZER: { platform: "organizer", origin: "https://partner.repeak.in", label: "Organizer Manager" },
  BRAND: { platform: "brand", origin: "https://brand.repeak.in", label: "Brand Manager" },
  CLUB: { platform: "club", origin: "https://club.repeak.in", label: "Club Manager" },
};
const BASE = (process.env.NEXT_PUBLIC_REPEAK_AI_BASE_URL || "https://claout-ai-746271877146.asia-south1.run.app").replace(/\/$/, "");
const MAX_LENGTH = 4000;
const MAX_MESSAGES = 20;
const FOCUSABLE = 'button:not([disabled]),a[href],textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
const createId = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
const createThreadId = () => `hub-${createId()}`.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 128);

function errorForStatus(status: number) {
  if (status === 400) return "The request could not be sent. Please try a shorter question.";
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have access to this answer.";
  if (status === 422) return "This question could not be validated. Start a new chat and try again.";
  if (status === 429) return "Too many requests. Please wait a moment and try again.";
  return "Repeak AI is temporarily unavailable. Please try again.";
}

function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      window.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

async function fetchWithBackoff(input: string, init: RequestInit & { signal: AbortSignal }) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(input, init);
    if (response.status !== 429 && response.status < 500) return response;
    if (attempt === 2) return response;
    const retryAfter = Number(response.headers.get("retry-after"));
    await delay(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 5000) : 500 * 2 ** attempt, init.signal);
  }
  throw new Error(errorForStatus(503));
}

function handleUnauthorized() {
  clearSession();
  window.location.assign("/login");
}

function inferPortal(pathname: string): Portal | null {
  const match = pathname.match(/^\/(?:details|activate)\/(organizer|brand|club)(?:\/|$)/i);
  return match ? (match[1].toUpperCase() as Portal) : null;
}

function validateActions(actions: unknown, portal: Portal): StoredAiAction[] {
  if (!Array.isArray(actions)) return [];
  const expected = PORTALS[portal];
  return actions.slice(0, 20).flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const action = candidate as Record<string, unknown>;
    const destination = action.destination as Record<string, unknown> | undefined;
    if (action.type !== "navigate" || typeof action.label !== "string" || !action.label.trim() || !destination || destination.platform !== expected.platform || typeof destination.route !== "string" || typeof destination.url !== "string") return [];
    const route = destination.route;
    if (!route.startsWith("/") || route.startsWith("//") || route.includes("\\")) return [];
    try {
      const url = new URL(destination.url);
      const routeUrl = new URL(route, expected.origin);
      if (url.protocol !== "https:" || url.origin !== expected.origin || routeUrl.origin !== expected.origin || `${url.pathname}${url.search}` !== `${routeUrl.pathname}${routeUrl.search}`) return [];
      return [{
        type: "navigate" as const,
        label: action.label.trim().slice(0, 100),
        destination: {
          platform: expected.platform,
          route,
          url: url.toString(),
          ...(typeof destination.key === "string" ? { key: destination.key } : {}),
          ...(typeof destination.deep_link_path === "string" ? { deep_link_path: destination.deep_link_path } : {}),
        },
      }];
    } catch { return []; }
  });
}

function parseGreeting(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const envelope = payload as Record<string, unknown>;
  const data = envelope.data && typeof envelope.data === "object" ? envelope.data as Record<string, unknown> : envelope;
  for (const key of ["text", "greeting", "message"]) {
    if (typeof data[key] === "string" && data[key].trim()) return data[key].trim().slice(0, MAX_LENGTH);
  }
  return null;
}

async function fetchGreeting(signal: AbortSignal) {
  const token = getStoredToken();
  if (!token) throw new Error(errorForStatus(401));
  const response = await fetchWithBackoff(`${BASE}/hub/greeting`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal,
  });
  if (response.status === 401) handleUnauthorized();
  if (!response.ok) throw new Error(errorForStatus(response.status));
  return parseGreeting(await response.json().catch(() => null)) || "Hi! I can help you navigate and use this Repeak workspace.";
}

async function streamChat(args: { threadId: string; text: string; messages: Message[]; portal: Portal; workspaceId: string; signal: AbortSignal; onProgress: (text: string) => void }): Promise<AssistantReply> {
  if (!navigator.onLine) throw new Error("You appear to be offline. Reconnect and try again.");
  const token = getStoredToken();
  if (!token) throw new Error(errorForStatus(401));
  const route = `${location.pathname}${location.search}`;
  const response = await fetchWithBackoff(`${BASE}/hub/chat`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream", "Content-Type": "application/json" },
    signal: args.signal,
    body: JSON.stringify({
      thread_id: args.threadId,
      message: args.text.slice(0, MAX_LENGTH),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone.slice(0, 64),
      portal: args.portal,
      workspace_id: args.workspaceId,
      current_page: { title: document.title.slice(0, 160), route: route.slice(0, 500), url: location.href.slice(0, 1000) },
      history: args.messages.filter((message) => !message.failed).slice(-MAX_MESSAGES).map(({ role, content }) => ({ role, content: content.slice(0, MAX_LENGTH) })),
    }),
  });
  if (response.status === 401) handleUnauthorized();
  if (!response.ok) throw new Error(errorForStatus(response.status));
  if (!response.body) throw new Error(errorForStatus(503));

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done }).replace(/\r\n/g, "\n");
    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const event = block.split("\n").find((line) => line.startsWith("event:"))?.slice(6).trim();
      const dataLines = block.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart());
      if (dataLines.length) {
        let data: Record<string, unknown> | null = null;
        try { data = JSON.parse(dataLines.join("\n")); } catch { data = null; }
        if (event === "progress") args.onProgress(String(data?.message || data?.text || "Working on it...").slice(0, 120));
        else if (event === "error") throw new Error(errorForStatus(503));
        else if (event === "final" && typeof data?.text === "string") return { text: data.text.slice(0, MAX_LENGTH), actions: data.actions as unknown[] | undefined };
      }
      boundary = buffer.indexOf("\n\n");
    }
    if (done) break;
  }
  throw new Error(errorForStatus(503));
}

export default function RepeakAiAssistant() {
  const pathname = usePathname() || "/";
  const titleId = useId();
  const fabRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const greetingRef = useRef(new Set<string>());
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selected, setSelected] = useState("");
  const [conversationLoaded, setConversationLoaded] = useState(false);
  const [threadId, setThreadId] = useState(createThreadId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState("Thinking...");
  const [error, setError] = useState("");
  const [retryText, setRetryText] = useState("");

  const availableWorkspaces = useMemo(() => workspaces.filter((workspace) => workspace.type in PORTALS && workspace.status !== "REVOKED"), [workspaces]);
  const activeWorkspace = useMemo(() => availableWorkspaces.find((workspace) => `${workspace.type}:${workspace.entityId}` === selected), [availableWorkspaces, selected]);
  const activePortal = activeWorkspace?.type as Portal | undefined;
  const contextKey = activeWorkspace && activePortal ? `${activePortal}:${activeWorkspace.entityId}` : "";

  useEffect(() => {
    const authenticated = isAuthenticated() && pathname !== "/login";
    setReady(authenticated);
    if (!authenticated) return;
    let cancelled = false;
    listWorkspaces().then((items) => {
      if (cancelled) return;
      const usable = items.filter((workspace) => workspace.type in PORTALS && workspace.status !== "REVOKED");
      setWorkspaces(usable);
      const inferred = inferPortal(pathname);
      const preferred = (inferred && usable.find((workspace) => workspace.type === inferred)) || usable[0];
      setSelected((current) => inferred && preferred
        ? `${preferred.type}:${preferred.entityId}`
        : usable.some((workspace) => `${workspace.type}:${workspace.entityId}` === current)
          ? current
          : preferred ? `${preferred.type}:${preferred.entityId}` : "");
    }).catch(() => { if (!cancelled) setWorkspaces([]); });
    return () => { cancelled = true; };
  }, [pathname]);

  useEffect(() => {
    if (!contextKey) { setConversationLoaded(true); setMessages([]); return; }
    let cancelled = false;
    setConversationLoaded(false);
    loadAiConversation(contextKey).then((saved) => {
      if (cancelled) return;
      setThreadId(saved.threadId || createThreadId());
      setMessages(saved.messages);
      setError(""); setRetryText(""); setConversationLoaded(true);
    });
    return () => { cancelled = true; };
  }, [contextKey]);

  const close = useCallback(() => { setOpen(false); requestAnimationFrame(() => fabRef.current?.focus()); }, []);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); return; }
      if (event.key !== "Tab" || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!nodes.length) return;
      if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0].focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", handleKeyDown); };
  }, [close, open]);

  useEffect(() => { if (open) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, open, pending, progress]);
  useEffect(() => {
    if (!open || !conversationLoaded || !contextKey || messages.length) return;
    const requestKey = `${contextKey}:${threadId}`;
    if (greetingRef.current.has(requestKey)) return;
    greetingRef.current.add(requestKey);
    const controller = new AbortController();
    fetchGreeting(controller.signal).then((content) => {
      const greeting: Message = { id: createId(), role: "assistant", content };
      setMessages([greeting]);
      void saveAiConversation(contextKey, threadId, [greeting]);
    }).catch((reason) => { if ((reason as Error).name !== "AbortError") setError((reason as Error).message || errorForStatus(503)); });
    return () => controller.abort();
  }, [contextKey, conversationLoaded, messages.length, open, threadId]);

  const send = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text || !activeWorkspace || !activePortal || pending || inFlightRef.current || text.length > MAX_LENGTH) return;
    inFlightRef.current = true;
    const previous = messages.filter((message) => !message.failed).slice(-MAX_MESSAGES);
    const user: Message = { id: createId(), role: "user", content: text };
    setMessages((current) => [...current, user]);
    setDraft(""); setPending(true); setError(""); setRetryText(text); setProgress("Thinking...");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await streamChat({ threadId, text, messages: previous, portal: activePortal, workspaceId: activeWorkspace.entityId, signal: controller.signal, onProgress: setProgress });
      const assistant: Message = { id: createId(), role: "assistant", content: result.text, actions: validateActions(result.actions, activePortal) };
      const finalMessages = [...previous, user, assistant].slice(-MAX_MESSAGES);
      setMessages(finalMessages); setRetryText("");
      await saveAiConversation(contextKey, threadId, finalMessages);
    } catch (reason) {
      if ((reason as Error).name !== "AbortError") {
        setError((reason as Error).message || errorForStatus(503));
        setMessages((current) => current.map((message) => message.id === user.id ? { ...message, failed: true } : message));
      }
    } finally { abortRef.current = null; inFlightRef.current = false; setPending(false); }
  }, [activePortal, activeWorkspace, contextKey, messages, pending, threadId]);

  const reset = () => {
    abortRef.current?.abort();
    const nextThreadId = createThreadId();
    abortRef.current = null; inFlightRef.current = false;
    setThreadId(nextThreadId); setMessages([]); setDraft(""); setError(""); setRetryText(""); setPending(false);
    if (contextKey) void setActiveAiThread(contextKey, nextThreadId);
  };

  if (process.env.NEXT_PUBLIC_REPEAK_AI_ASSISTANT_ENABLED === "false" || !ready) return null;
  return <div className={styles.root}>
    <button ref={fabRef} className={styles.fab} type="button" aria-label="Open Repeak AI Assistant" title="Ask Repeak AI" aria-expanded={open} onClick={() => setOpen(true)}><Sparkles size={23} aria-hidden /></button>
    {open ? <>
      <button className={styles.backdrop} type="button" aria-label="Close Repeak AI Assistant" onClick={close} />
      <aside ref={panelRef} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className={styles.header}>
          <span className={styles.mark}><Sparkles size={21} aria-hidden /></span>
          <div className={styles.titles}><div className={styles.title} id={titleId}>Repeak AI</div><div className={styles.context}>Workspace assistant</div></div>
          <div className={styles.headerButtons}>
            <button className={styles.icon} type="button" aria-label="New conversation" title="New conversation" onClick={reset}><RotateCcw size={19} /></button>
            <button className={styles.icon} type="button" aria-label="Close assistant" onClick={close}><X size={21} /></button>
          </div>
        </header>
        <div className={styles.workspaceBar}>
          <label htmlFor={`${titleId}-workspace`}>Portal context</label>
          <select id={`${titleId}-workspace`} value={selected} disabled={pending} onChange={(event) => setSelected(event.target.value)}>
            {!availableWorkspaces.length ? <option value="">No active workspace</option> : null}
            {availableWorkspaces.map((workspace) => <option key={`${workspace.type}:${workspace.entityId}`} value={`${workspace.type}:${workspace.entityId}`}>{PORTALS[workspace.type as Portal].label} · {workspace.displayName}</option>)}
          </select>
        </div>
        <div className={styles.messages} aria-live="polite">
          {!activeWorkspace ? <section className={styles.welcome}><h2>Choose a workspace first</h2><p>Activate an Organizer, Brand, or Club workspace to ask contextual questions.</p></section> : null}
          {activeWorkspace && conversationLoaded && !messages.length && !pending ? <div className={styles.progress} role="status"><span className={styles.dots} aria-hidden><i /><i /><i /></span>Preparing your workspace assistant...</div> : null}
          {messages.map((message) => message.role === "user" ? <div key={message.id} className={`${styles.message} ${styles.user} ${message.failed ? styles.failed : ""}`}>{message.content}</div> : <div key={message.id} className={`${styles.message} ${styles.assistant}`}><div className={styles.answer}><SafeMarkdown text={message.content} /></div><div className={styles.actions}><button className={styles.action} type="button" onClick={() => void navigator.clipboard.writeText(message.content)}><Copy size={14} /> Copy</button></div></div>)}
          {pending ? <div className={styles.progress} role="status"><span className={styles.dots} aria-hidden><i /><i /><i /></span>{progress}</div> : null}
          <div ref={endRef} />
        </div>
        <div>
          {error ? <div className={styles.error} role="alert"><span>{error}</span>{retryText ? <button className={styles.action} type="button" onClick={() => { const value = retryText; setMessages((current) => current.filter((message) => !(message.failed && message.content === value))); void send(value); }}><RefreshCw size={14} /> Retry</button> : null}</div> : null}
          <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); void send(draft); }}>
            <div className={styles.box}>
              <textarea rows={1} maxLength={MAX_LENGTH} value={draft} aria-label="Ask about this portal" placeholder={activeWorkspace ? `Ask about ${PORTALS[activePortal!].label}...` : "Choose a workspace to start"} disabled={!activeWorkspace || !conversationLoaded} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(draft); } }} />
              {pending ? <button type="button" className={styles.send} aria-label="Stop response" onClick={() => abortRef.current?.abort()}><Square size={17} fill="currentColor" /></button> : <button type="submit" className={styles.send} aria-label="Send message" disabled={!activeWorkspace || !draft.trim()}><ArrowUp size={20} /></button>}
            </div>
            <div className={styles.hint}>{draft.length > 3600 ? `${draft.length}/${MAX_LENGTH}` : "Enter to send · Shift+Enter for a new line"}</div>
          </form>
        </div>
      </aside>
    </> : null}
  </div>;
}
