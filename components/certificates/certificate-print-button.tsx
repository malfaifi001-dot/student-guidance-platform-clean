"use client";

import { useEffect } from "react";

export function CertificatePrintButton({
  autoPrint = false,
  showButton = true,
}: {
  autoPrint?: boolean;
  showButton?: boolean;
}) {
  useEffect(() => {
    if (!autoPrint) return;

    const print = () => {
      window.requestAnimationFrame(() => window.print());
    };

    if (document.readyState === "complete") {
      print();
      return;
    }

    window.addEventListener("load", print, { once: true });
    return () => window.removeEventListener("load", print);
  }, [autoPrint]);

  if (!showButton) return null;

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
    >
      طباعة الشهادة
    </button>
  );
}
