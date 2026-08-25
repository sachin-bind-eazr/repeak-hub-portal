"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { OMIcon } from "./OMIcon";

export type OMButtonVariant = "primary" | "secondary" | "ghost";
export type OMButtonSize = "sm" | "md" | "lg";

type OMButtonOwnProps = {
  children?: ReactNode;
  variant?: OMButtonVariant;
  size?: OMButtonSize;
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  href?: string;
  external?: boolean;
  testId?: string;
  className?: string;
  style?: CSSProperties;
  title?: string;
};

export type OMButtonProps = OMButtonOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof OMButtonOwnProps>;

const ICON_SIZE: Record<OMButtonSize, 16 | 20> = { sm: 16, md: 16, lg: 20 };

export function OMButton({
  children,
  variant = "secondary",
  size = "md",
  icon,
  iconPosition = "left",
  loading = false,
  disabled = false,
  fullWidth = false,
  href,
  external,
  testId,
  className,
  style,
  type = "button",
  ...rest
}: OMButtonProps) {
  const isDisabled = disabled || loading;
  const classes = [
    "om-btn",
    `om-btn--${variant}`,
    `om-btn--${size}`,
    fullWidth ? "om-btn--full" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const iconSize = ICON_SIZE[size];
  const glyph = icon ? <OMIcon icon={icon} size={iconSize} /> : null;

  const content = loading ? (
    <>
      <OMIcon icon={Loader2} size={iconSize} className="om-btn__spinner" />
      {children}
    </>
  ) : (
    <>
      {iconPosition === "left" && glyph}
      {children}
      {iconPosition === "right" && glyph}
    </>
  );

  if (href && !isDisabled) {
    return (
      <Link
        href={href}
        data-testid={testId}
        className={classes}
        style={style}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        title={rest.title}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      {...rest}
      type={type}
      data-testid={testId}
      className={classes}
      style={style}
      disabled={isDisabled}
      data-loading={loading ? "true" : undefined}
      aria-busy={loading || undefined}
    >
      {content}
    </button>
  );
}
