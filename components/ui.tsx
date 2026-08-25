"use client";

/**
 * Hub Portal UI primitives — thin wrappers over the `.om-*` primitive
 * port in `components/om/` (itself a port of
 * web-partner-portal/components/organizer-v2/primitives/). Kept as a
 * separate module so existing call sites (login, activate/*) don't need
 * to change their imports; the visual language underneath is now the
 * real Organizer Manager one (om-card / om-btn / om-field / om-input),
 * not a hand-rolled Tailwind approximation of it.
 */

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { OMCard } from "./om/OMCard";
import { OMField, OMInput, OMTextarea, OMFileInput } from "./om/OMField";
import { OMButton } from "./om/OMButton";

export function Card({
  children,
  className = "",
  title,
  description,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  description?: ReactNode;
}) {
  return (
    <OMCard className={className} title={title} description={description}>
      {children}
    </OMCard>
  );
}

export function Field({
  label,
  help,
  error,
  required,
  children,
}: {
  label: string;
  help?: string;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <OMField label={label} help={help} error={error ?? undefined} required={required}>
      {children}
    </OMField>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <OMInput {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <OMTextarea {...props} />;
}

export function FileInput({
  onChange,
  required,
  accept = "image/*,.pdf",
}: {
  onChange: (file: File | null) => void;
  required?: boolean;
  accept?: string;
}) {
  return <OMFileInput onChange={onChange} required={required} accept={accept} />;
}

type ButtonVariant = "primary" | "secondary";

export function Button({
  variant = "primary",
  fullWidth = false,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}) {
  return (
    <OMButton {...rest} variant={variant} size="lg" fullWidth={fullWidth} className={className}>
      {children}
    </OMButton>
  );
}
