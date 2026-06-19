"use client";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  X,
  XCircle,
} from "lucide-react";

type MobilePopCardVariant = "info" | "success" | "warning" | "error";

type MobilePopCardProps = {
  open: boolean;
  title: string;
  description?: string;
  variant?: MobilePopCardVariant;
  confirmLabel?: string;
  closeLabel?: string;
  loading?: boolean;
  children?: ReactNode;
  onConfirm?: () => void;
  onClose: () => void;
};

function getTone(variant: MobilePopCardVariant) {
  if (variant === "success") {
    return {
      Icon: CheckCircle2,
      iconClass: "bg-emerald-50 text-emerald-600 ring-emerald-100",
      confirmClass:
        "bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700",
      accentClass: "from-emerald-300 via-cyan-200 to-sky-200",
    };
  }

  if (variant === "warning") {
    return {
      Icon: AlertTriangle,
      iconClass: "bg-amber-50 text-amber-600 ring-amber-100",
      confirmClass:
        "bg-amber-500 text-white shadow-amber-200 hover:bg-amber-600",
      accentClass: "from-amber-200 via-orange-100 to-sky-100",
    };
  }

  if (variant === "error") {
    return {
      Icon: XCircle,
      iconClass: "bg-rose-50 text-rose-600 ring-rose-100",
      confirmClass:
        "bg-rose-600 text-white shadow-rose-200 hover:bg-rose-700",
      accentClass: "from-rose-200 via-orange-100 to-sky-100",
    };
  }

  return {
    Icon: Info,
    iconClass: "bg-sky-50 text-sky-600 ring-sky-100",
    confirmClass:
      "bg-sky-600 text-white shadow-sky-200 hover:bg-sky-700",
    accentClass: "from-sky-200 via-cyan-100 to-white",
  };
}

export function MobilePopCard({
  open,
  title,
  description,
  variant = "info",
  confirmLabel = "متابعة",
  closeLabel = "إغلاق",
  loading = false,
  children,
  onConfirm,
  onClose,
}: MobilePopCardProps) {
  if (!open) return null;

  const tone = getTone(variant);
  const Icon = tone.Icon;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[120] bg-slate-950/45 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[430px] p-3">
        <section
          className="overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-2xl shadow-sky-100/80"
          onClick={(event) => event.stopPropagation()}
        >
          <div
            className={[
              "h-2 w-full bg-gradient-to-l",
              tone.accentClass,
            ].join(" ")}
          />

          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div
                className={[
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1",
                  tone.iconClass,
                ].join(" ")}
              >
                <Icon className="h-6 w-6" />
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <h2 className="mt-4 text-xl font-black leading-8 text-slate-950">
              {title}
            </h2>

            {description ? (
              <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
                {description}
              </p>
            ) : null}

            {children ? <div className="mt-4">{children}</div> : null}

            <div className="mt-5 flex flex-col gap-2">
              {onConfirm ? (
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={loading}
                  className={[
                    "flex h-12 items-center justify-center gap-2 rounded-[1.35rem] text-sm font-black shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60",
                    tone.confirmClass,
                  ].join(" ")}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {loading ? "جارٍ التنفيذ..." : confirmLabel}
                </button>
              ) : null}

              <button
                type="button"
                onClick={onClose}
                className="flex h-12 items-center justify-center rounded-[1.35rem] bg-sky-50 text-sm font-black text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-100"
              >
                {closeLabel}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
