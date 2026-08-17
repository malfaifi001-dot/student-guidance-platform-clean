"use client";

import { X } from "lucide-react";
import { MOBILE_LAYER_Z_INDEX } from "./mobile-layer-contract";

export type MobileFeedbackKind = "success" | "error" | "warning" | "info";

const kindStyles: Record<MobileFeedbackKind, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
};

export function MobileFeedbackPopCard({
  kind,
  title,
  message,
  onDismiss,
}: {
  kind: MobileFeedbackKind;
  title: string;
  message?: string;
  onDismiss: () => void;
}) {
  return (
    <div className={`fixed inset-x-4 top-4 ${MOBILE_LAYER_Z_INDEX.feedback} sm:inset-x-auto sm:right-4 sm:w-96`} style={{ marginTop: "env(safe-area-inset-top)" }}>
      <section className={`rounded-xl border p-4 shadow-sm ${kindStyles[kind]}`} role={kind === "error" ? "alert" : "status"} aria-live="polite">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">{title}</h2>
            {message ? <p className="mt-1 text-sm leading-6 opacity-80">{message}</p> : null}
          </div>
          <button type="button" onClick={onDismiss} aria-label="إغلاق" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}
