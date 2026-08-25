"use client";

import type { ReactNode } from "react";
import type { StatusTone } from "./StatusPill";

const TONE_VARS: Record<StatusTone, { bg: string; fg: string }> = {
  success: { bg: "var(--rp-success-bg)", fg: "var(--rp-success-fg)" },
  warning: { bg: "var(--rp-warning-bg)", fg: "var(--rp-warning-fg)" },
  danger: { bg: "var(--rp-danger-bg)", fg: "var(--rp-danger-fg)" },
  info: { bg: "var(--rp-info-bg)", fg: "var(--rp-info-fg)" },
  neutral: { bg: "var(--rp-neutral-bg)", fg: "var(--rp-neutral-fg)" },
};

/** Honest in-page callout — errors, guidance, and contextual state. */
export function Callout({
  tone = "info",
  title,
  description,
  action,
  testId,
}: {
  tone?: StatusTone;
  title?: ReactNode;
  description: ReactNode;
  action?: { label: string; href?: string; onClick?: () => void };
  testId?: string;
}) {
  const { bg, fg } = TONE_VARS[tone];
  return (
    <div
      data-testid={testId}
      style={{
        backgroundColor: bg,
        border: `1px solid color-mix(in srgb, ${fg} 22%, transparent)`,
        borderRadius: "var(--rp-radius-lg)",
        padding: 14,
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          backgroundColor: fg,
          marginTop: 6,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--rp-text-primary)",
              marginBottom: 2,
            }}
          >
            {title}
          </div>
        )}
        <div style={{ fontSize: 13, color: "var(--rp-text-secondary)", lineHeight: 1.5 }}>
          {description}
        </div>
        {action &&
          (action.href ? (
            <a
              href={action.href}
              style={{
                display: "inline-block",
                marginTop: 8,
                fontSize: 12,
                fontWeight: 600,
                color: fg,
                textDecoration: "underline",
              }}
            >
              {action.label}
            </a>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              style={{
                display: "inline-block",
                marginTop: 8,
                fontSize: 12,
                fontWeight: 600,
                color: fg,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
                textDecoration: "underline",
              }}
            >
              {action.label}
            </button>
          ))}
      </div>
    </div>
  );
}
