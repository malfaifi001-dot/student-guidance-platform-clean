"use client";

import { useEffect, useRef } from "react";

export function CurriculumDistributionPrintController({ enabled }: { enabled: boolean }) {
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled || startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;

    async function printWhenReady() {
      try {
        if (document.fonts?.ready) await document.fonts.ready;
      } catch {
        // Printing remains available if font loading is unavailable.
      }

      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

      if (!cancelled) window.setTimeout(() => {
        if (!cancelled) window.print();
      }, 350);
    }

    void printWhenReady();
    return () => {
      cancelled = true;
      startedRef.current = false;
    };
  }, [enabled]);

  return null;
}
