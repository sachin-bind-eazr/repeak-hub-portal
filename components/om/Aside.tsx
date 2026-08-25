"use client";

/**
 * Sidebar content for the Activate wizards — "what you'll need" /
 * "what happens next" / support. Exists so a wide viewport isn't just a
 * narrow card floating in empty canvas; every card here is real,
 * static copy (no fabricated data), matching the OM pattern of
 * pairing a form with a readiness/help rail.
 */

import type { ReactNode } from "react";
import { CheckCircle2, Circle, LifeBuoy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { OMCard } from "./OMCard";
import { OMIcon } from "./OMIcon";

export function RequirementList({
  title = "What you'll need",
  description,
  items,
}: {
  title?: string;
  description?: string;
  items: { label: string; required?: boolean; note?: string }[];
}) {
  return (
    <OMCard title={title} description={description}>
      <ul style={{ display: "flex", flexDirection: "column", gap: 10, margin: 0, padding: 0, listStyle: "none" }}>
        {items.map((item) => (
          <li key={item.label} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <OMIcon
              icon={item.required ? CheckCircle2 : Circle}
              size={16}
              color={item.required ? "var(--rp-primary)" : "var(--rp-text-muted)"}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--rp-text-primary)" }}>
                {item.label}
                {!item.required && (
                  <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 500, color: "var(--rp-text-muted)" }}>
                    Optional
                  </span>
                )}
              </div>
              {item.note && (
                <div style={{ fontSize: 12, color: "var(--rp-text-tertiary)", marginTop: 1 }}>{item.note}</div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </OMCard>
  );
}

export function NumberedSteps({
  title = "What happens next",
  steps,
}: {
  title?: string;
  steps: { label: string; description?: string }[];
}) {
  return (
    <OMCard title={title}>
      <ol style={{ display: "flex", flexDirection: "column", gap: 12, margin: 0, padding: 0, listStyle: "none" }}>
        {steps.map((step, i) => (
          <li key={step.label} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span
              aria-hidden
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 20,
                height: 20,
                borderRadius: 999,
                background: "var(--rp-surface-sunken)",
                color: "var(--rp-text-secondary)",
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--rp-text-primary)" }}>{step.label}</div>
              {step.description && (
                <div style={{ fontSize: 12, color: "var(--rp-text-tertiary)", marginTop: 1, lineHeight: 1.5 }}>
                  {step.description}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </OMCard>
  );
}

export function SupportCard({
  description = "If anything about verification is unclear, reach out and we'll walk you through it.",
  icon: Icon = LifeBuoy,
  children,
}: {
  description?: string;
  icon?: LucideIcon;
  children?: ReactNode;
}) {
  return (
    <OMCard elevation="flat" className="om-card--inset">
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <OMIcon icon={Icon} size={20} color="var(--rp-text-tertiary)" />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--rp-text-primary)" }}>Need help?</div>
          <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--rp-text-tertiary)", lineHeight: 1.55 }}>
            {description}
          </p>
          {children}
        </div>
      </div>
    </OMCard>
  );
}
