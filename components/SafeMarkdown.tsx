"use client";

import { Fragment, type ReactNode } from "react";

function safeHref(value: string): string | null {
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && !/(?:^|\/)\.\.?\/?/.test(value)) return value;
  try {
    const url = new URL(value);
    const official = url.hostname === "repeak.in" || url.hostname.endsWith(".repeak.in");
    return url.protocol === "https:" && official ? url.toString() : null;
  } catch { return null; }
}

function Inline({ text }: { text: string }) {
  return <>{String(text).split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g).map((token, index): ReactNode => {
    if (token.startsWith("**") && token.endsWith("**")) return <strong key={index}>{token.slice(2, -2)}</strong>;
    if (token.startsWith("`") && token.endsWith("`")) return <code key={index}>{token.slice(1, -1)}</code>;
    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) { const href = safeHref(link[2]); return href ? <a key={index} href={href} target={href.startsWith("/") ? undefined : "_blank"} rel={href.startsWith("/") ? undefined : "noopener noreferrer"}>{link[1]}</a> : <Fragment key={index}>{link[1]}</Fragment>; }
    return <Fragment key={index}>{token}</Fragment>;
  })}</>;
}

export default function SafeMarkdown({ text }: { text: string }) {
  const output: ReactNode[] = []; let list: string[] = []; let ordered = false;
  const flush = () => { if (!list.length) return; const Tag = ordered ? "ol" : "ul"; output.push(<Tag key={`list-${output.length}`}>{list.map((item, i) => <li key={i}><Inline text={item} /></li>)}</Tag>); list = []; };
  String(text || "").split(/\r?\n/).forEach((line, index) => {
    const bullet = line.match(/^\s*[-*]\s+(.+)$/); const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (bullet || numbered) { const next = Boolean(numbered); if (list.length && next !== ordered) flush(); ordered = next; list.push((bullet || numbered)![1]); return; }
    flush(); if (!line.trim()) { output.push(<br key={`space-${index}`} />); return; }
    const heading = line.match(/^#{1,3}\s+(.+)$/); output.push(heading ? <strong key={index}><Inline text={heading[1]} /></strong> : <p key={index}><Inline text={line} /></p>);
  }); flush(); return <>{output}</>;
}
