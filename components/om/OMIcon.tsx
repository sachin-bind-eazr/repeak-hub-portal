"use client";

import type { LucideIcon } from "lucide-react";

export type OMIconSize = 16 | 20 | 24;

export function OMIcon({
  icon: Icon,
  size = 16,
  label,
  color,
  className,
  strokeWidth = 1.75,
}: {
  icon: LucideIcon;
  size?: OMIconSize;
  label?: string;
  color?: string;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      color={color}
      className={className}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      style={{ flexShrink: 0 }}
    />
  );
}
