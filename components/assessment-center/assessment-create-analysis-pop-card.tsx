"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { AssessmentCenterUploadClient } from "./assessment-center-upload-client";

export function AssessmentCreateAnalysisPopCard() {
  const [open, setOpen] = useState(false);

  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-sky-900 transition hover:bg-sky-50"><Plus className="h-4 w-4" />إنشاء تحليل جديد</button>
    {open ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" dir="rtl"><section role="dialog" aria-modal="true" aria-labelledby="new-assessment-title" className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900 sm:p-6"><header className="mb-5 flex items-start justify-between gap-4"><div><h2 id="new-assessment-title" className="text-xl font-black text-slate-950 dark:text-white">إنشاء تحليل جديد</h2><p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">ارفع ملف النتائج لبدء التحليل.</p></div><button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="إغلاق"><X className="h-5 w-5" /></button></header><AssessmentCenterUploadClient embedded onCancel={() => setOpen(false)} /></section></div> : null}
  </>;
}
