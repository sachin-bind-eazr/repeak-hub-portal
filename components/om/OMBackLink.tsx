"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { OMIcon } from "./OMIcon";

export function OMBackLink({
  label,
  href,
  onClick,
}: {
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <OMIcon icon={ArrowLeft} size={16} />
      {label}
    </>
  );
  if (href) {
    return (
      <Link href={href} className="om-backlink">
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className="om-backlink">
      {inner}
    </button>
  );
}
