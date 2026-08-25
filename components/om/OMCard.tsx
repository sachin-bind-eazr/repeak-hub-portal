"use client";

import type { CSSProperties, ReactNode } from "react";

export type OMCardPadding = "none" | "sm" | "md" | "lg";
export type OMCardElevation = "flat" | "raised";

export function OMCard({
  children,
  title,
  description,
  headerRight,
  footer,
  padding = "md",
  elevation = "raised",
  as: Tag = "div",
  titleAs: TitleTag = "h2",
  testId,
  className,
  style,
}: {
  children?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  headerRight?: ReactNode;
  footer?: ReactNode;
  padding?: OMCardPadding;
  elevation?: OMCardElevation;
  as?: "div" | "section" | "article";
  titleAs?: "h2" | "h3" | "h4";
  testId?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const classes = [
    "om-card",
    `om-card--pad-${padding}`,
    elevation === "flat" ? "om-card--flat" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const hasHeader = Boolean(title || description || headerRight);

  return (
    <Tag data-testid={testId} className={classes} style={style}>
      {hasHeader && (
        <div className="om-card__header">
          <div className="om-card__heading">
            {title && <TitleTag className="om-card__title">{title}</TitleTag>}
            {description && <p className="om-card__desc">{description}</p>}
          </div>
          {headerRight}
        </div>
      )}
      {children != null && <div className="om-card__body">{children}</div>}
      {footer && <div className="om-card__footer">{footer}</div>}
    </Tag>
  );
}
