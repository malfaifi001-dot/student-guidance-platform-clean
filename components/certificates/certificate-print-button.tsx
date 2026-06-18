"use client";

export function CertificatePrintButton() {
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