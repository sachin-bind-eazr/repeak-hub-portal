"use client";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_VARS: Record<StatusTone, { bg: string; fg: string }> = {
  success: { bg: "var(--rp-success-bg)", fg: "var(--rp-success-fg)" },
  warning: { bg: "var(--rp-warning-bg)", fg: "var(--rp-warning-fg)" },
  danger: { bg: "var(--rp-danger-bg)", fg: "var(--rp-danger-fg)" },
  info: { bg: "var(--rp-info-bg)", fg: "var(--rp-info-fg)" },
  neutral: { bg: "var(--rp-neutral-bg)", fg: "var(--rp-neutral-fg)" },
};

export function StatusPill({
  tone = "neutral",
  label,
  dot = true,
}: {
  tone?: StatusTone;
  label: string;
  dot?: boolean;
}) {
  const { bg, fg } = TONE_VARS[tone];
  return (
    <span className="om-status-pill" style={{ backgroundColor: bg, color: fg }}>
      {dot && (
        <span className="om-status-pill__dot" aria-hidden style={{ backgroundColor: fg }} />
      )}
      {label}
    </span>
  );
}
