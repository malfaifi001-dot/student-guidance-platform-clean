"use client";

import { useEffect } from "react";

export function AssessmentAnalysisPrintController() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      await document.fonts.ready;
      if (cancelled) return;

      await new Promise<void>((resolve) => setTimeout(resolve, 350));
      if (cancelled) return;

      window.print();
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
