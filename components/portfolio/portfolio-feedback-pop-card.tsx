"use client";

import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import type { ReactNode } from "react";

export type PortfolioFeedback = {
  type: "success" | "error" | "confirm";
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm?: () => void;
};

export function PortfolioFeedbackPopCard({ feedback, loading, children, onClose }: {
  feedback: PortfolioFeedback | null;
  loading?: boolean;
  children?: ReactNode;
  onClose: () => void;
}) {
  if (!feedback) return null;
  const SuccessIcon = feedback.type === "success" ? CheckCircle2 : AlertTriangle;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" dir="rtl">
      <section className="w-full max-w-lg rounded-[2rem] border border-white/70 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <span className={`grid h-14 w-14 place-items-center rounded-2xl ${feedback.type === "success" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
            <SuccessIcon className="h-7 w-7" />
          </span>
          <button type="button" onClick={onClose} disabled={loading} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <h2 className="mt-5 text-xl font-black text-slate-950">{feedback.title}</h2>
        {feedback.description ? <p className="mt-2 text-sm font-bold leading-7 text-slate-600">{feedback.description}</p> : null}
        {children ? <div className="mt-5">{children}</div> : null}
        <div className="mt-6 flex gap-3">
          {feedback.onConfirm ? <button type="button" disabled={loading} onClick={feedback.onConfirm} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{feedback.confirmLabel || "تأكيد"}</button> : null}
          <button type="button" disabled={loading} onClick={onClose} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700">{feedback.onConfirm ? "إلغاء" : "إغلاق"}</button>
        </div>
      </section>
    </div>
  );
}
