"use client";

import { CheckCircle2, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

type DownloadFeedback = {
  type: "success" | "error";
  fileName?: string;
  message?: string;
};

export function NativeDownloadFeedbackHost() {
  const [feedback, setFeedback] = useState<DownloadFeedback | null>(null);

  useEffect(() => {
    const onFeedback = (event: Event) => {
      const detail = (event as CustomEvent<DownloadFeedback>).detail;
      setFeedback(detail);
      window.setTimeout(() => setFeedback(null), 4500);
    };

    window.addEventListener("teachix:native-download-feedback", onFeedback);
    return () => window.removeEventListener("teachix:native-download-feedback", onFeedback);
  }, []);

  if (!feedback) return null;

  const success = feedback.type === "success";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[210] flex justify-center px-4" dir="rtl">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-xl shadow-slate-950/15 dark:border-white/10 dark:bg-slate-900"
      >
        {success ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        ) : (
          <XCircle className="h-5 w-5 shrink-0 text-rose-600" />
        )}
        <p className="min-w-0 flex-1 text-sm font-black text-slate-900 dark:text-slate-100">
          {feedback.message || (success ? "تم التحميل بنجاح" : "تعذر تحميل الملف، حاول مرة أخرى")}
          {success && feedback.fileName ? (
            <span className="mt-0.5 block truncate text-xs font-bold text-slate-500 dark:text-slate-400">
              {feedback.fileName}
            </span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={() => setFeedback(null)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="إغلاق إشعار التحميل"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
