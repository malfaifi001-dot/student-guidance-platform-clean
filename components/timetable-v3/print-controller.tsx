"use client";

import { useEffect } from "react";

export function TimetableV3PrintController({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(timer);
  }, [enabled]);
  return null;
}
