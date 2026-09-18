/**
 * Design tokens ported from web-partner-portal's Repeak Console
 * (`components/partner-hub/tokens.ts`) so the Hub Portal's home page
 * matches the OM/BM/CM `/hub` launcher look-and-feel exactly rather
 * than approximating it with plain Tailwind. Values resolve to the
 * same `--rp-*` CSS vars already defined in `app/repeak-theme.css`
 * (a byte-for-byte copy of the partner portal's file), so the two
 * apps stay visually identical without a shared package. Trimmed to
 * what the Hub actually needs — no data-viz palette, no left-rail
 * layout constants.
 */

export const CONSOLE = {
  canvas: "var(--rp-canvas)",
  surface: "var(--rp-surface)",
  surfaceSunken: "var(--rp-surface-sunken)",
  surfaceSub: "var(--rp-surface-sub)",
  topbarBg: "var(--rp-topbar-bg)",
  topbarBorder: "var(--rp-topbar-border)",
  textPrimary: "var(--rp-text-primary)",
  textSecondary: "var(--rp-text-secondary)",
  textTertiary: "var(--rp-text-tertiary)",
  textMuted: "var(--rp-text-muted)",
  rule: "var(--rp-rule)",
  ruleStrong: "var(--rp-rule-strong)",
  shadowSoft: "var(--rp-shadow-soft)",
  shadowCard: "var(--rp-shadow-card)",
  shadowLift: "var(--rp-shadow-lift)",
  glassBg: "rgba(255, 255, 255, 0.72)",
  glassBorder: "rgba(255, 255, 255, 0.42)",
} as const;

export const ACCENT = {
  brandDeep: "var(--rp-brand-deep)",
  brandBright: "var(--rp-brand-bright)",
  coralDeep: "var(--rp-coral-deep)",
  coralBright: "var(--rp-coral-bright)",
  limeDeep: "var(--rp-lime-deep)",
  limeBright: "var(--rp-lime-bright)",
  amberDeep: "var(--rp-amber-deep)",
  amberBright: "var(--rp-amber-bright)",
} as const;

/** Per-product accent — matches the live OM/BM/CM launcher tiles exactly
 * (`web-partner-portal/lib/partner-hub-apps.ts` HUB_APPS[].accent). */
export const PRODUCT_ACCENT = {
  ORGANIZER: "#1e3a8a",
  BRAND: "#5b21b6",
  CLUB: "#166534",
} as const;

export const MOTION = {
  fast: "var(--rp-motion-fast) var(--rp-ease)",
  medium: "var(--rp-motion-base) var(--rp-ease)",
  slow: "var(--rp-motion-slow) var(--rp-ease)",
} as const;

export const TYPE = {
  eyebrow: { size: 11, weight: 700, tracking: "0.16em" },
} as const;

export const FONT = {
  display: "var(--font-manrope), 'Manrope', system-ui, -apple-system, sans-serif",
  ui: "var(--font-manrope), 'Manrope', system-ui, -apple-system, sans-serif",
  mono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
} as const;

export const LOGO = {
  white: "/repeak-wordmark-white.svg",
  color: "/logo/repeak-logo-full-green.svg",
} as const;
