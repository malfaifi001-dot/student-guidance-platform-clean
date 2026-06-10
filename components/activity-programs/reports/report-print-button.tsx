"use client";

export function ReportPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
    >
      طباعة / حفظ PDF
    </button>
  );
}