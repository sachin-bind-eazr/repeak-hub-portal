"use client";

import { useId, useState } from "react";
import type {
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { Upload } from "lucide-react";
import { OMIcon } from "./OMIcon";

export function OMField({
  label,
  required = false,
  help,
  error,
  children,
  htmlFor,
  testId,
  className,
  style,
}: {
  label?: ReactNode;
  required?: boolean;
  help?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
  testId?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const generated = useId();
  const id = htmlFor ?? `om-field-${generated}`;

  return (
    <div
      data-testid={testId}
      className={["om-field", className].filter(Boolean).join(" ")}
      style={style}
    >
      {label && (
        <label className="om-field__label" htmlFor={id}>
          {label}
          {required && (
            <span className="om-field__required" aria-hidden>
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <span className="om-field__error" role="alert">
          {error}
        </span>
      ) : (
        help && <span className="om-field__help">{help}</span>
      )}
    </div>
  );
}

export function OMFieldGroup({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={["om-field-group", className].filter(Boolean).join(" ")}
      style={style}
    >
      {children}
    </div>
  );
}

export function OMInput({
  invalid,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...rest}
      aria-invalid={invalid || undefined}
      className={["om-input", className].filter(Boolean).join(" ")}
    />
  );
}

export function OMTextarea({
  invalid,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      {...rest}
      aria-invalid={invalid || undefined}
      className={["om-textarea", className].filter(Boolean).join(" ")}
    />
  );
}

export function OMFileInput({
  onChange,
  required,
  accept = "image/*,.pdf",
  buttonLabel = "Choose file",
  emptyLabel = "No file selected",
}: {
  onChange: (file: File | null) => void;
  required?: boolean;
  accept?: string;
  buttonLabel?: string;
  emptyLabel?: string;
}) {
  return (
    <FileInputInner
      onChange={onChange}
      required={required}
      accept={accept}
      buttonLabel={buttonLabel}
      emptyLabel={emptyLabel}
    />
  );
}

function FileInputInner({
  onChange,
  required,
  accept,
  buttonLabel,
  emptyLabel,
}: {
  onChange: (file: File | null) => void;
  required?: boolean;
  accept: string;
  buttonLabel: string;
  emptyLabel: string;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  return (
    <div className="om-file">
      <span className="om-btn om-btn--secondary om-btn--sm" aria-hidden="true">
        <OMIcon icon={Upload} size={16} />
        {buttonLabel}
      </span>
      <span className="om-file__name" data-picked={fileName ? "true" : "false"}>
        {fileName ?? emptyLabel}
      </span>
      <input
        type="file"
        className="om-file__input"
        accept={accept}
        required={required}
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          setFileName(file?.name ?? null);
          onChange(file);
        }}
      />
    </div>
  );
}
