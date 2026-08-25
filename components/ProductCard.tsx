"use client";

/**
 * Ported from web-partner-portal's `components/partner-hub/HubAppCard.tsx`
 * — same premium launcher-tile look the OM/BM/CM `/hub` pages use.
 * Two footer actions: "Details" navigates to /details/<product> (the
 * full workspace/portal info lives there, not inline here — see that
 * page for role/status/joined-date/host); "Open"/"Activate" performs
 * the actual action — `mintAndRedirect()` for an owned workspace, or a
 * plain navigation to the /activate/<product> apply form for a new one.
 */

import Link from "next/link";
import { CONSOLE, FONT, MOTION, TYPE } from "@/lib/hub-tokens";
import { ArrowRightIcon, iconForWorkspaceType } from "./hub-icons";
import type { WorkspaceType } from "@/lib/workspaces";

export interface ProductInfo {
  type: WorkspaceType;
  name: string;
  category: string;
  description: string;
  accent: string;
  host: string;
  url: string;
  /** "What's inside" bullets — shown on the /details page. Optional so
   *  ProductCard (which doesn't render these) isn't forced to change. */
  capabilities?: string[];
}

export function ProductCard({
  product,
  state,
  onClick,
}: {
  product: ProductInfo;
  /** "activate" = no workspace yet; "repair" = linked legacy workspace is
   *  missing; "open" = launchable; "opening" = mint
   *  in flight; otherwise a human label for a blocked approval state. */
  state: "activate" | "open" | "opening" | string;
  onClick: () => void;
}) {
  const Icon = iconForWorkspaceType(product.type);
  const blocked = state !== "activate" && state !== "repair" && state !== "open" && state !== "opening";
  const ctaLabel =
    state === "opening"
      ? "Opening…"
      : state === "activate"
        ? "Activate"
        : state === "repair"
          ? "Complete linked account"
          : state === "open"
            ? "Open"
            : state;

  return (
    <div
      data-testid={`hub-product-card-${product.type.toLowerCase()}`}
      className="hub-product-card"
      style={
        {
          display: "flex",
          flexDirection: "column",
          gap: 14,
          padding: "22px 24px",
          background: `${product.accent}0E`,
          border: `1px solid ${product.accent}26`,
          borderRadius: 14,
          boxShadow: CONSOLE.shadowLift,
          transition: `border-color ${MOTION.fast}`,
          minHeight: 220,
          position: "relative",
          overflow: "hidden",
          ["--app-accent" as string]: product.accent,
        } as React.CSSProperties
      }
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          aria-hidden="true"
          style={{
            width: 48,
            height: 48,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: `${product.accent}15`,
            color: product.accent,
            borderRadius: 12,
            border: `1px solid ${product.accent}28`,
            flexShrink: 0,
          }}
        >
          <Icon size={26} color={product.accent} strokeWidth={1.7} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: TYPE.eyebrow.size,
              fontWeight: TYPE.eyebrow.weight,
              letterSpacing: TYPE.eyebrow.tracking,
              textTransform: "uppercase",
              color: product.accent,
            }}
          >
            {product.category}
          </div>
          <div
            style={{
              fontSize: 19,
              fontWeight: 700,
              color: CONSOLE.textPrimary,
              letterSpacing: "-0.018em",
              marginTop: 4,
              fontFamily: FONT.display,
              lineHeight: 1.15,
            }}
          >
            {product.name}
          </div>
        </div>
      </div>

      <p
        style={{
          margin: 0,
          fontSize: 13.5,
          color: CONSOLE.textSecondary,
          lineHeight: 1.55,
          flex: 1,
          fontFamily: FONT.ui,
        }}
      >
        {product.description}
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          paddingTop: 14,
          borderTop: `1px solid ${CONSOLE.rule}`,
        }}
      >
        <Link
          href={`/details/${product.type.toLowerCase()}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 12px",
            borderRadius: 999,
            border: `1px solid ${CONSOLE.ruleStrong}`,
            background: CONSOLE.surface,
            color: CONSOLE.textSecondary,
            fontSize: 12.5,
            fontWeight: 600,
            fontFamily: FONT.ui,
            textDecoration: "none",
          }}
        >
          Details
        </Link>

        <button
          type="button"
          onClick={onClick}
          disabled={blocked || state === "opening"}
          className="hub-product-card-open"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 14px",
            borderRadius: 999,
            border: `1px solid ${blocked ? CONSOLE.rule : product.accent}55`,
            background: blocked ? CONSOLE.surfaceSunken : `${product.accent}15`,
            color: blocked ? CONSOLE.textTertiary : product.accent,
            fontSize: 12.5,
            fontWeight: 700,
            fontFamily: FONT.ui,
            cursor: blocked ? "not-allowed" : "pointer",
          }}
        >
          {ctaLabel}
          {!blocked && (
            <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center" }}>
              <ArrowRightIcon size={13} strokeWidth={2} />
            </span>
          )}
        </button>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .hub-product-card:hover { border-color: var(--app-accent); }
        .hub-product-card-open:not(:disabled):hover { filter: brightness(0.97); }
      `,
        }}
      />
    </div>
  );
}
