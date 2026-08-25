"use client";

/**
 * Hub Portal — page-level product header. Structural port of
 * OrganizerProductHeader (web-partner-portal/components/organizer-v2)
 * so an Activate wizard reads as the same product as Organizer Manager:
 * back link, breadcrumbs, eyebrow, title, description, status pill,
 * and a right-aligned primary/secondary action.
 */

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { OMButton } from "./OMButton";
import { OMIcon } from "./OMIcon";
import { OMBackLink } from "./OMBackLink";

export type Breadcrumb = { label: string; href?: string };

export function ProductHeader({
  eyebrow,
  title,
  description,
  breadcrumbs,
  primaryAction,
  secondaryAction,
  status,
  backLink,
  testId,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  primaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
    disabled?: boolean;
  };
  secondaryAction?: { label: string; href?: string; onClick?: () => void };
  status?: ReactNode;
  backLink?: { label: string; href?: string; onClick?: () => void };
  testId?: string;
}) {
  return (
    <header
      data-testid={testId ?? "hub-product-header"}
      style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}
    >
      {backLink && (
        <OMBackLink label={backLink.label} href={backLink.href} onClick={backLink.onClick} />
      )}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "var(--rp-text-tertiary)",
            flexWrap: "wrap",
          }}
        >
          {breadcrumbs.map((b, i) => (
            <span key={`${b.label}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {b.href ? (
                <Link href={b.href} style={{ color: "var(--rp-text-tertiary)", textDecoration: "none" }}>
                  {b.label}
                </Link>
              ) : (
                <span style={{ color: "var(--rp-text-primary)", fontWeight: 600 }}>{b.label}</span>
              )}
              {i < breadcrumbs.length - 1 && (
                <span style={{ color: "var(--rp-text-muted)", display: "inline-flex" }}>
                  <OMIcon icon={ChevronRight} size={16} />
                </span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          {eyebrow && (
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--rp-primary)",
                marginBottom: 4,
              }}
            >
              {eyebrow}
            </div>
          )}
          {title && (
            <h1
              style={{
                fontSize: "clamp(22px, 2.6vw, 30px)",
                fontWeight: 700,
                letterSpacing: "-0.022em",
                lineHeight: 1.15,
                margin: 0,
                color: "var(--rp-text-primary)",
              }}
            >
              {title}
            </h1>
          )}
          {description && (
            <p
              style={{
                margin: "8px 0 0",
                fontSize: 14,
                color: "var(--rp-text-tertiary)",
                lineHeight: 1.55,
                maxWidth: 640,
              }}
            >
              {description}
            </p>
          )}
        </div>
        {(status || primaryAction || secondaryAction) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              justifyContent: "flex-end",
              flexShrink: 0,
            }}
          >
            {status}
            {secondaryAction && (
              <OMButton
                variant="secondary"
                size="lg"
                href={secondaryAction.href}
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </OMButton>
            )}
            {primaryAction && (
              <OMButton
                variant="primary"
                size="lg"
                href={primaryAction.href}
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
              >
                {primaryAction.label}
              </OMButton>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
