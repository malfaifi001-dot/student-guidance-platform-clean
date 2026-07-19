"use client";

import {
  AlertTriangle,
  CheckCircle2,
  X,
  XCircle,
} from "lucide-react";
import type { ReferenceLibraryFeedback } from "@/components/reference-library/admin-reference-library-types";

export function ReferenceLibraryFeedbackCard({
  feedback,
  onClose,
}: {
  feedback: ReferenceLibraryFeedback;
  onClose: () => void;
}) {
  if (!feedback) {
    return null;
  }

  const appearance =
    feedback.type === "success"
      ? {
          icon: CheckCircle2,
          wrapper: "border-emerald-200 bg-emerald-50",
          iconBox: "bg-emerald-100 text-emerald-700",
          title: "text-emerald-950",
          message: "text-emerald-800",
        }
      : feedback.type === "warning"
        ? {
            icon: AlertTriangle,
            wrapper: "border-amber-200 bg-amber-50",
            iconBox: "bg-amber-100 text-amber-700",
            title: "text-amber-950",
            message: "text-amber-800",
          }
        : {
            icon: XCircle,
            wrapper: "border-rose-200 bg-rose-50",
            iconBox: "bg-rose-100 text-rose-700",
            title: "text-rose-950",
            message: "text-rose-800",
          };

  const Icon = appearance.icon;

  return (
    <div
      className={`fixed bottom-5 left-5 z-[80] w-[min(92vw,420px)] rounded-[24px] border p-4 shadow-2xl ${appearance.wrapper}`}
      role="status"
      dir="rtl"
    >
      <div className="flex items-start gap-3">
        <div
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${appearance.iconBox}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className={`font-black ${appearance.title}`}>
            {feedback.title}
          </p>

          <p
            className={`mt-1 text-sm font-bold leading-6 ${appearance.message}`}
          >
            {feedback.message}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/70 text-slate-500 transition hover:bg-white hover:text-slate-950"
          aria-label="إغلاق الرسالة"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}