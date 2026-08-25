import type { Config } from "tailwindcss";

// Matches the Organizer/Brand/Club Manager design system 1:1 — see
// app/repeak-theme.css for the `--rp-*` CSS variables these resolve
// to, and components/brand-v2/tokens.ts in web-partner-portal for the
// canonical TypeScript token object this mirrors. No shared package
// exists across apps in this monorepo, so this is a hand-kept copy of
// the same semantic names, not an import.
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--rp-canvas)",
        surface: "var(--rp-surface)",
        "surface-muted": "var(--rp-surface-muted)",
        "surface-sunken": "var(--rp-surface-sunken)",
        border: "var(--rp-border)",
        "border-strong": "var(--rp-border-strong)",
        "border-subtle": "var(--rp-border-subtle)",
        "text-primary": "var(--rp-text-primary)",
        "text-secondary": "var(--rp-text-secondary)",
        "text-tertiary": "var(--rp-text-tertiary)",
        "text-muted": "var(--rp-text-muted)",
        primary: "var(--rp-primary)",
        "primary-hover": "var(--rp-primary-hover)",
        "primary-fg": "var(--rp-primary-fg)",
        "danger-bg": "var(--rp-danger-bg)",
        "danger-fg": "var(--rp-danger-fg)",
        "success-bg": "var(--rp-success-bg)",
        "success-fg": "var(--rp-success-fg)",
        "warning-bg": "var(--rp-warning-bg)",
        "warning-fg": "var(--rp-warning-fg)",
      },
      borderRadius: {
        rp: "var(--rp-radius-md)",
        "rp-sm": "var(--rp-radius-sm)",
        "rp-lg": "var(--rp-radius-lg)",
        "rp-xl": "var(--rp-radius-xl)",
        "rp-pill": "var(--rp-radius-pill)",
      },
      boxShadow: {
        "rp-soft": "var(--rp-shadow-soft)",
        "rp-card": "var(--rp-shadow-card)",
        "rp-float": "var(--rp-shadow-float)",
      },
      fontFamily: {
        sans: [
          "var(--font-manrope)",
          "Manrope",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
