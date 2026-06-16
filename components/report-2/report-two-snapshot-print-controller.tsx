"use client";

import { useEffect } from "react";

export function ReportTwoSnapshotPrintController() {
  useEffect(() => {
    function triggerPrint() {
      window.print();
    }

    if (document.readyState === "complete") {
      triggerPrint();
    } else {
      window.addEventListener("load", triggerPrint, { once: true });
    }
  }, []);

  return null;
}
