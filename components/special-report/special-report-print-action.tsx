"use client";

import {
  Printer,
} from "lucide-react";

export function SpecialReportPrintAction() {
  return (
    <button
      type="button"
      onClick={() =>
        window.print()
      }
      className="fixed bottom-6 left-6 z-50 inline-flex h-12 items-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-xl transition hover:bg-slate-800 print:hidden"
    >
      <Printer className="h-4 w-4" />

      طباعة / حفظ PDF
    </button>
  );
}