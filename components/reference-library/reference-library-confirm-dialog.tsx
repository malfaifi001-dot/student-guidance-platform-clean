"use client";

import {
  AlertTriangle,
  LoaderCircle,
  X,
} from "lucide-react";

export function ReferenceLibraryConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  busy,
  destructive = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busy: boolean;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm"
      dir="rtl"
    >
      <div className="w-full max-w-md rounded-[30px] border border-white/70 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-black text-slate-950">
                {title}
              </h2>

              <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                {description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={
              destructive
                ? "inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white transition hover:bg-rose-700 disabled:opacity-50"
                : "inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
            }
          >
            {busy ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : null}

            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}