"use client";

import type { MouseEvent, ReactNode } from "react";
import { useState } from "react";
import { isNativeCapacitor } from "@/lib/native/native-runtime";
import { downloadUrlAsFile } from "@/lib/print-export/print-export-download";

type NativeDownloadLinkProps = {
  href: string;
  fileName?: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  target?: string;
  rel?: string;
};

export function NativeDownloadLink({
  href,
  fileName = "download.bin",
  children,
  className,
  ariaLabel,
  target,
  rel,
}: NativeDownloadLinkProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!isNativeCapacitor()) return;
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      await downloadUrlAsFile(href, fileName);
    } finally {
      setLoading(false);
    }
  }

  return (
    <a href={href} onClick={handleClick} aria-label={ariaLabel} aria-busy={loading} target={target} rel={rel} className={className}>
      {loading ? "جارٍ التحميل..." : children}
    </a>
  );
}
