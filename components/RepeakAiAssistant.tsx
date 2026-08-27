"use client";

import {
  ArrowUp,
  Copy,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { getStoredToken, isAuthenticated } from "@/lib/auth";
import SafeMarkdown from "./SafeMarkdown";
import styles from "./RepeakAiAssistant.module.css";

type AssistantAction = {
  type: string;
  label: string;
  destination?: { platform?: string; route?: string };
};

type AssistantSuggestion = { type: string; label: string; message?: string };

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  failed?: boolean;
  actions?: AssistantAction[];
  suggestions?: AssistantSuggestion[];
};

type AssistantReply = {
  text: string;
  actions?: AssistantAction[];
  suggestions?: AssistantSuggestion[];
};

const BASE = (
  process.env.NEXT_PUBLIC_REPEAK_AI_BASE_URL ||
  "https://claout-ai-746271877146.asia-south1.run.app"
).replace(/\/$/, "");
const MAX_LENGTH = 4000;
const FOCUSABLE =
  'button:not([disabled]),a[href],textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const ALLOWED_PREFIXES = ["/home", "/profile", "/details", "/activate"];

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const createThreadId = () =>
  `hub-${createId()}`.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 128);

const errorForStatus = (status: number) => {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have access to this answer.";
  if (status === 429)
    return "Too many requests. Please wait a moment and try again.";
  return "Repeak AI is temporarily unavailable. Please try again.";
};

async function streamChat(args: {
  threadId: string;
  text: string;
  messages: Message[];
  pathname: string;
  signal: AbortSignal;
  onProgress: (text: string) => void;
}): Promise<AssistantReply> {
  if (!navigator.onLine) {
    throw new Error("You appear to be offline. Reconnect and try again.");
  }

  const token = getStoredToken();
  if (!token) throw new Error(errorForStatus(401));

  const response = await fetch(`${BASE}/hub/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "text/event-stream",
      "Content-Type": "application/json",
    },
    signal: args.signal,
    body: JSON.stringify({
      thread_id: args.threadId,
      message: args.text.slice(0, MAX_LENGTH),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone.slice(0, 64),
      history: args.messages
        .filter((message) => !message.failed)
        .slice(-20)
        .map(({ role, content }) => ({
          role,
          content: content.slice(0, MAX_LENGTH),
        })),
      current_page: {
        title: document.title.slice(0, 160),
        route: args.pathname.slice(0, 500),
        url: `${location.origin}${args.pathname}`.slice(0, 1000),
      },
    }),
  });

  if (!response.ok) throw new Error(errorForStatus(response.status));
  if (!response.body) throw new Error(errorForStatus(503));

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder
      .decode(value || new Uint8Array(), { stream: !done })
      .replace(/\r\n/g, "\n");

    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const event = block
        .split("\n")
        .find((line) => line.startsWith("event:"))
        ?.slice(6)
        .trim();
      const dataLines = block
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart());

      if (dataLines.length) {
        let data: Record<string, unknown> | null = null;
        try {
          data = JSON.parse(dataLines.join("\n"));
        } catch {
          data = null;
        }

        if (event === "progress") {
          args.onProgress(
            String(data?.message || data?.text || "Working on it...").slice(
              0,
              120,
            ),
          );
        }
        if (event === "error") throw new Error(errorForStatus(503));
        if (event === "final" && data?.text) {
          return data as unknown as AssistantReply;
        }
      }

      boundary = buffer.indexOf("\n\n");
    }

    if (done) break;
  }

  throw new Error(errorForStatus(503));
}

export default function RepeakAiAssistant() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const titleId = useId();
  const fabRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [threadId, setThreadId] = useState(createThreadId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState("Thinking...");
  const [error, setError] = useState("");
  const [retryText, setRetryText] = useState("");

  useEffect(() => {
    setReady(isAuthenticated() && pathname !== "/login");
  }, [pathname]);

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => fabRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() =>
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus(),
    );

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const nodes = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      );
      if (!nodes.length) return;
      if (event.shiftKey && document.activeElement === nodes[0]) {
        event.preventDefault();
        nodes.at(-1)?.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === nodes.at(-1)
      ) {
        event.preventDefault();
        nodes[0].focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, open]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open, pending, progress]);

  const isAllowed = (route: string) => {
    if (
      !route.startsWith("/") ||
      route.startsWith("//") ||
      route.includes("\\")
    ) {
      return false;
    }
    const cleanRoute = route.split(/[?#]/)[0];
    return ALLOWED_PREFIXES.some(
      (prefix) => cleanRoute === prefix || cleanRoute.startsWith(`${prefix}/`),
    );
  };

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || pending || inFlightRef.current || text.length > MAX_LENGTH) {
        return;
      }

      inFlightRef.current = true;
      const previous = messages;
      const user: Message = { id: createId(), role: "user", content: text };
      setMessages((current) => [...current, user]);
      setDraft("");
      setPending(true);
      setError("");
      setRetryText(text);
      setProgress("Thinking...");

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const result = await streamChat({
          threadId,
          text,
          messages: previous,
          pathname,
          signal: controller.signal,
          onProgress: setProgress,
        });
        setMessages((current) => [
          ...current,
          {
            id: createId(),
            role: "assistant",
            content: result.text,
            actions: result.actions,
            suggestions: result.suggestions,
          },
        ]);
        setRetryText("");
      } catch (reason) {
        if ((reason as Error).name !== "AbortError") {
          setError((reason as Error).message || errorForStatus(503));
          setMessages((current) =>
            current.map((message) =>
              message.id === user.id ? { ...message, failed: true } : message,
            ),
          );
        }
      } finally {
        abortRef.current = null;
        inFlightRef.current = false;
        setPending(false);
      }
    },
    [messages, pathname, pending, threadId],
  );

  const reset = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    inFlightRef.current = false;
    setThreadId(createThreadId());
    setMessages([]);
    setDraft("");
    setError("");
    setRetryText("");
    setPending(false);
  };

  if (
    process.env.NEXT_PUBLIC_REPEAK_AI_ASSISTANT_ENABLED === "false" ||
    !ready
  ) {
    return null;
  }

  return (
    <div className={styles.root}>
      <button
        ref={fabRef}
        className={styles.fab}
        type="button"
        aria-label="Open Repeak AI Assistant"
        title="Ask Repeak AI"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Sparkles size={23} aria-hidden />
      </button>

      {open ? (
        <>
          <button
            className={styles.backdrop}
            type="button"
            aria-label="Close Repeak AI Assistant"
            onClick={close}
          />
          <aside
            ref={panelRef}
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <header className={styles.header}>
              <span className={styles.mark}>
                <Sparkles size={21} aria-hidden />
              </span>
              <div className={styles.titles}>
                <div className={styles.title} id={titleId}>
                  Repeak AI
                </div>
                <div className={styles.context}>Hub Assistant</div>
              </div>
              <div className={styles.headerButtons}>
                <button
                  className={styles.icon}
                  type="button"
                  aria-label="New conversation"
                  title="New conversation"
                  onClick={reset}
                >
                  <RotateCcw size={19} />
                </button>
                <button
                  className={styles.icon}
                  type="button"
                  aria-label="Close assistant"
                  onClick={close}
                >
                  <X size={21} />
                </button>
              </div>
            </header>

            <div className={styles.messages} aria-live="polite">
              {!messages.length ? (
                <section className={styles.welcome}>
                  <h2>How can I help?</h2>
                  <p>
                    Ask about Hub access, products, workspaces, or information
                    available to your account.
                  </p>
                  <div className={styles.chips}>
                    {[
                      "How do I switch between portals?",
                      "What access does my role have?",
                      "Where can I manage my profile?",
                      "What does my approval status mean?",
                    ].map((question) => (
                      <button
                        className={styles.chip}
                        type="button"
                        key={question}
                        onClick={() => void send(question)}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {messages.map((message) =>
                message.role === "user" ? (
                  <div
                    key={message.id}
                    className={`${styles.message} ${styles.user}`}
                  >
                    {message.content}
                  </div>
                ) : (
                  <div
                    key={message.id}
                    className={`${styles.message} ${styles.assistant}`}
                  >
                    <div className={styles.answer}>
                      <SafeMarkdown text={message.content} />
                    </div>
                    <div className={styles.actions}>
                      <button
                        className={styles.action}
                        type="button"
                        onClick={() =>
                          void navigator.clipboard.writeText(message.content)
                        }
                      >
                        <Copy size={14} /> Copy
                      </button>
                      {message.actions
                        ?.filter(
                          (action) =>
                            action.type === "navigate" &&
                            action.destination?.platform === "hub" &&
                            isAllowed(action.destination.route || ""),
                        )
                        .map((action) => (
                          <button
                            className={styles.action}
                            type="button"
                            key={action.destination?.route}
                            onClick={() => {
                              router.push(action.destination?.route || "/home");
                              close();
                            }}
                          >
                            {action.label}
                          </button>
                        ))}
                      {message.suggestions
                        ?.filter(
                          (suggestion) =>
                            suggestion.type === "reply" && suggestion.message,
                        )
                        .slice(0, 3)
                        .map((suggestion) => (
                          <button
                            className={styles.action}
                            type="button"
                            key={suggestion.message}
                            onClick={() => void send(suggestion.message || "")}
                          >
                            {suggestion.label}
                          </button>
                        ))}
                    </div>
                  </div>
                ),
              )}

              {pending ? (
                <div className={styles.progress} role="status">
                  <span className={styles.dots} aria-hidden>
                    <i />
                    <i />
                    <i />
                  </span>
                  {progress}
                </div>
              ) : null}
              <div ref={endRef} />
            </div>

            <div>
              {error ? (
                <div className={styles.error} role="alert">
                  <span>{error}</span>
                  {retryText ? (
                    <button
                      className={styles.action}
                      type="button"
                      onClick={() => {
                        const value = retryText;
                        setMessages((current) =>
                          current.filter(
                            (message) =>
                              !(message.failed && message.content === value),
                          ),
                        );
                        void send(value);
                      }}
                    >
                      <RefreshCw size={14} /> Retry
                    </button>
                  ) : null}
                </div>
              ) : null}

              <form
                className={styles.composer}
                onSubmit={(event) => {
                  event.preventDefault();
                  void send(draft);
                }}
              >
                <div className={styles.box}>
                  <textarea
                    rows={1}
                    maxLength={MAX_LENGTH}
                    value={draft}
                    aria-label="Ask about this portal"
                    placeholder="Ask about this portal..."
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void send(draft);
                      }
                    }}
                  />
                  {pending ? (
                    <button
                      type="button"
                      className={styles.send}
                      aria-label="Stop response"
                      onClick={() => abortRef.current?.abort()}
                    >
                      <Square size={17} fill="currentColor" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className={styles.send}
                      aria-label="Send message"
                      disabled={!draft.trim()}
                    >
                      <ArrowUp size={20} />
                    </button>
                  )}
                </div>
                <div className={styles.hint}>
                  {draft.length > 3600
                    ? `${draft.length}/${MAX_LENGTH}`
                    : "Enter to send - Shift+Enter for a new line"}
                </div>
              </form>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
