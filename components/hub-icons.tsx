/**
 * Ported from web-partner-portal's `components/partner-hub/icons.tsx`
 * (Repeak Console icon set) — same bespoke SVG glyphs the OM/BM/CM
 * `/hub` launcher uses, so the product tiles read as the same product
 * rather than generic Heroicons/emoji.
 */

import type { CSSProperties, SVGProps } from "react";
import type { WorkspaceType } from "@/lib/workspaces";

export interface RepeakIconProps extends Omit<SVGProps<SVGSVGElement>, "color"> {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: CSSProperties;
}

function base(size: number, color: string, strokeWidth: number, rest: SVGProps<SVGSVGElement>) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
}

export function RepeakMarkIcon({
  size = 24,
  color = "currentColor",
  strokeWidth = 1.6,
  ...rest
}: RepeakIconProps) {
  return (
    <svg {...base(size, color, strokeWidth, rest)} aria-hidden="true">
      <path d="M3 18 L8 12 L11 15 L16 7 L21 14" />
      <circle cx="16" cy="7" r="1.4" fill={color} stroke="none" />
    </svg>
  );
}

/** Organizer — checkered flag with motion lines. */
export function OrganizerIcon({
  size = 24,
  color = "currentColor",
  strokeWidth = 1.6,
  ...rest
}: RepeakIconProps) {
  return (
    <svg {...base(size, color, strokeWidth, rest)} aria-hidden="true">
      <path d="M5 21 L5 4" />
      <path d="M5 4 C 9 3, 13 6, 17 4 L17 12 C 13 14, 9 11, 5 12" />
      <path d="M5 6 L8 6 M11 6 L14 6 M5 9 L8 9 M11 9 L14 9" opacity="0.5" />
    </svg>
  );
}

/** Brand — sparkle within a peak frame. */
export function BrandIcon({
  size = 24,
  color = "currentColor",
  strokeWidth = 1.6,
  ...rest
}: RepeakIconProps) {
  return (
    <svg {...base(size, color, strokeWidth, rest)} aria-hidden="true">
      <path d="M12 3 L14.5 9.5 L21 12 L14.5 14.5 L12 21 L9.5 14.5 L3 12 L9.5 9.5 Z" />
      <path d="M12 8 L13 11 L16 12 L13 13 L12 16 L11 13 L8 12 L11 11 Z" opacity="0.4" />
    </svg>
  );
}

/** Club — three figures with rhythm dots. */
export function ClubIcon({
  size = 24,
  color = "currentColor",
  strokeWidth = 1.6,
  ...rest
}: RepeakIconProps) {
  return (
    <svg {...base(size, color, strokeWidth, rest)} aria-hidden="true">
      <circle cx="8" cy="8" r="2.5" />
      <circle cx="16" cy="8" r="2.5" />
      <path d="M3 19 C 3 15.5, 5 14, 8 14 C 11 14, 13 15.5, 13 19" />
      <path d="M11 19 C 11 15.5, 13 14, 16 14 C 19 14, 21 15.5, 21 19" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 16, color = "currentColor", strokeWidth = 1.6, ...rest }: RepeakIconProps) {
  return (
    <svg {...base(size, color, strokeWidth, rest)} aria-hidden="true">
      <path d="M5 12 H19 M13 6 L19 12 L13 18" />
    </svg>
  );
}

export function ChevronDownIcon({ size = 14, color = "currentColor", strokeWidth = 1.8, ...rest }: RepeakIconProps) {
  return (
    <svg {...base(size, color, strokeWidth, rest)} aria-hidden="true">
      <path d="M5 9 L12 16 L19 9" />
    </svg>
  );
}

export function UserIcon({ size = 20, color = "currentColor", strokeWidth = 1.6, ...rest }: RepeakIconProps) {
  return (
    <svg {...base(size, color, strokeWidth, rest)} aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4 21 C 4 17, 7.5 14.5, 12 14.5 C 16.5 14.5, 20 17, 20 21" />
    </svg>
  );
}

export function iconForWorkspaceType(type: WorkspaceType): (props: RepeakIconProps) => React.ReactElement {
  switch (type) {
    case "ORGANIZER":
      return OrganizerIcon;
    case "BRAND":
      return BrandIcon;
    case "CLUB":
    case "COMMUNITY":
      return ClubIcon;
    default:
      return RepeakMarkIcon;
  }
}
