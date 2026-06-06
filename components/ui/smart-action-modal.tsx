"use client";

import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from "lucide-react";
import type { ReactNode } from "react";

type SmartActionModalVariant = "info" | "success" | "warning" | "danger" | "error";

type SmartActionModalProps = {
  open: boolean;
  title: string;
  description?: string;
  variant?: SmartActionModalVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  children?: ReactNode;
  onConfirm?: () => void;
  onClose: () => void;
};

function getTone(variant: SmartActionModalVariant) {
  if (variant === "success") {
    return {
      icon: CheckCircle2,
      iconClass: "bg-emerald-50 text-emerald-600 ring-emerald-100",
      barClass: "from-emerald-400 via-teal-300 to-sky-300",
      buttonClass: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100",
    };
  }

  if (variant === "danger" || variant === "error") {
    return {
      icon: XCircle,
      iconClass: "bg-rose-50 text-rose-600 ring-rose-100",
      barClass: "from-rose-400 via-orange-300 to-amber-300",
      buttonClass: "bg-rose-600 hover:bg-rose-700 shadow-rose-100",
    };
  }

  if (variant === "warning") {
    return {
      icon: AlertTriangle,
      iconClass: "bg-amber-50 text-amber-600 ring-amber-100",
      barClass: "from-amber-300 via-orange-300 to-sky-300",
      buttonClass: "bg-amber-600 hover:bg-amber-700 shadow-amber-100",
    };
  }

  return {
    icon: Info,
    iconClass: "bg-sky-50 text-sky-600 ring-sky-100",
    barClass: "from-sky-400 via-cyan-300 to-emerald-300",
    buttonClass: "bg-sky-600 hover:bg-sky-700 shadow-sky-100",
  };
}

export function SmartActionModal({
  open,
  title,
  description,
  variant = "info",
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  loading,
  children,
  onConfirm,
  onClose,
}: SmartActionModalProps) {
  if (!open) return null;

  const tone = getTone(variant);
  const Icon = tone.icon;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
    >
      <section className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-2xl shadow-slate-950/20">
        <div className={["absolute inset-x-0 top-0 h-1.5 bg-gradient-to-l", tone.barClass].join(" ")} />

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className={["grid h-14 w-14 shrink-0 place-items-center rounded-3xl ring-1", tone.iconClass].join(" ")}>
              <Icon className="h-7 w-7" />
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              aria-label="إغلاق"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>

          <h2 className="mt-5 text-2xl font-black leading-[1.35] text-slate-950">
            {title}
          </h2>

          {description ? (
            <p className="mt-3 text-sm font-bold leading-7 text-slate-600">
              {description}
            </p>
          ) : null}

          {children ? <div className="mt-5">{children}</div> : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
            {onConfirm ? (
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={[
                  "flex h-12 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-black text-white shadow-lg transition disabled:opacity-60",
                  tone.buttonClass,
                ].join(" ")}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                {loading ? "جار التنفيذ..." : confirmLabel}
              </button>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-6 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {onConfirm ? cancelLabel : "إغلاق"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
