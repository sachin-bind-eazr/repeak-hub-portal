"use client";

/**
 * Ported from web-partner-portal's `components/partner-hub/PeakMotif.tsx`
 * — the recurring "elevation profile" brand signature used in the
 * OM/BM/CM hero banners. Trimmed to the "rule" backdrop variant, which
 * is all the Hub's hero uses.
 */

import { CSSProperties } from "react";

export function PeakBackdrop({
  color = "#00B4A6",
  opacity = 0.28,
  className,
  style,
}: {
  color?: string;
  opacity?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1280 320"
      preserveAspectRatio="none"
      className={className}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", ...style }}
    >
      <g stroke={color} strokeOpacity={opacity} strokeWidth={1} fill="none">
        <path d="M-20 240 L120 200 L260 218 L380 160 L520 200 L680 130 L820 178 L960 110 L1100 156 L1300 100" />
        <path
          d="M-20 180 L120 140 L260 158 L380 100 L520 140 L680 70 L820 118 L960 50 L1100 96 L1300 40"
          strokeOpacity={opacity * 0.6}
        />
        <path
          d="M-20 280 L120 240 L260 258 L380 200 L520 240 L680 170 L820 218 L960 150 L1100 196 L1300 140"
          strokeOpacity={opacity * 1.5}
        />
      </g>
    </svg>
  );
}
