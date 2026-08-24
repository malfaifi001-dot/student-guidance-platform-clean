"use client";

import { BookOpen, Download, Layers, Loader2, X } from "lucide-react";

const COPY = {
  title: "\u0625\u0631\u0633\u0627\u0644",
  description: "\u0627\u062e\u062a\u0631 \u0645\u062d\u062a\u0648\u0649 \u0627\u0644\u0625\u0631\u0633\u0627\u0644 \u0644\u0647\u0630\u0627 \u0627\u0644\u0623\u0633\u0628\u0648\u0639.",
  close: "\u0625\u063a\u0644\u0627\u0642",
  one: "\u0625\u0631\u0633\u0627\u0644 \u0647\u0630\u0647 \u0627\u0644\u0645\u0627\u062f\u0629",
  all: "\u0625\u0631\u0633\u0627\u0644 \u062c\u0645\u064a\u0639 \u0645\u0648\u0627\u062f \u0645\u0646\u0647\u062c\u064a",
  preparing: "\u062c\u0627\u0631\u064d \u062a\u062c\u0647\u064a\u0632 \u0645\u0644\u0641 PDF...",
  sharing: "\u062c\u0627\u0631\u064d \u0641\u062a\u062d \u062e\u064a\u0627\u0631\u0627\u062a \u0627\u0644\u0645\u0634\u0627\u0631\u0643\u0629...",
  unsupported: "\u0627\u0644\u0645\u0634\u0627\u0631\u0643\u0629 \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629 \u0644\u0644\u0645\u0644\u0641\u0627\u062a \u063a\u064a\u0631 \u0645\u062f\u0639\u0648\u0645\u0629 \u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u0645\u062a\u0635\u0641\u062d.",
  download: "\u062a\u0646\u0632\u064a\u0644 \u0645\u0644\u0641 PDF",
  error: "\u062a\u0639\u0630\u0631 \u062a\u062c\u0647\u064a\u0632 \u0645\u0644\u0641 \u0627\u0644\u0645\u0646\u0647\u062c \u062d\u0627\u0644\u064a\u064b\u0627.",
};

export type CurriculumSendStatus = "idle" | "preparing" | "sharing" | "unsupported" | "error";

export function CurriculumSendPopCard({ open, onClose, onSingle, onAll, status = "idle", onDownload }: { open: boolean; onClose: () => void; onSingle: () => void; onAll: () => void; status?: CurriculumSendStatus; onDownload?: () => void }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" dir="rtl" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section role="dialog" aria-modal="true" aria-labelledby="curriculum-send-title" className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl">
      <div className="flex items-start justify-between gap-3"><div><h2 id="curriculum-send-title" className="text-lg font-black text-slate-950">{COPY.title}</h2><p className="mt-1 text-xs font-bold text-slate-500">{COPY.description}</p></div><button type="button" onClick={onClose} title={COPY.close} aria-label={COPY.close} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
      {status === "preparing" || status === "sharing" ? <div className="flex items-center gap-2 rounded-xl bg-sky-50 p-3 text-sm font-black text-sky-800"><Loader2 className="h-5 w-5 animate-spin" />{status === "preparing" ? COPY.preparing : COPY.sharing}</div> : status === "unsupported" ? <div className="space-y-3"><p className="rounded-xl bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-900">{COPY.unsupported}</p><button type="button" onClick={onDownload} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 text-sm font-black text-white hover:bg-slate-800"><Download className="h-4 w-4" />{COPY.download}</button></div> : status === "error" ? <p className="rounded-xl bg-rose-50 p-3 text-sm font-bold leading-6 text-rose-800">{COPY.error}</p> : <div className="mt-4 grid gap-2"><button type="button" onClick={onSingle} className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm font-black text-slate-800 hover:border-sky-300 hover:bg-sky-50"><BookOpen className="h-5 w-5 text-sky-700" />{COPY.one}</button><button type="button" onClick={onAll} className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm font-black text-slate-800 hover:border-sky-300 hover:bg-sky-50"><Layers className="h-5 w-5 text-sky-700" />{COPY.all}</button></div>}
    </section>
  </div>;
}
