"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from "lucide-react";

type SmartFeedbackModalProps = {
  open: boolean;
  type?: "success" | "error" | "warning" | "info";
  title: string;
  description?: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
};

export function SmartFeedbackModal({
  open,
  type = "success",
  title,
  description,
  primaryActionLabel = "إغلاق",
  secondaryActionLabel,
  onPrimaryAction,
  onSecondaryAction,
}: SmartFeedbackModalProps) {
  if (!open) {
    return null;
  }

  const iconMap = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const colorMap = {
    success: {
      icon: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      button: "bg-emerald-600 hover:bg-emerald-700",
    },
    error: {
      icon: "text-rose-600",
      bg: "bg-rose-50",
      border: "border-rose-100",
      button: "bg-rose-600 hover:bg-rose-700",
    },
    warning: {
      icon: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
      button: "bg-amber-600 hover:bg-amber-700",
    },
    info: {
      icon: "text-sky-600",
      bg: "bg-sky-50",
      border: "border-sky-100",
      button: "bg-sky-600 hover:bg-sky-700",
    },
  };

  const Icon = iconMap[type];
  const colors = colorMap[type];

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div
        className={`w-full max-w-md rounded-[2rem] border ${colors.border} ${colors.bg} p-8 shadow-2xl`}
      >
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg">
            <Icon className={`h-10 w-10 ${colors.icon}`} />
          </div>
        </div>

        <div className="mt-6 text-center">
          <h2 className="text-3xl font-black text-slate-900">
            {title}
          </h2>

          {description ? (
            <p className="mt-4 text-sm leading-7 text-slate-600">
              {description}
            </p>
          ) : null}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {secondaryActionLabel ? (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              {secondaryActionLabel}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onPrimaryAction}
            className={`rounded-2xl px-6 py-3 text-sm font-black text-white transition ${colors.button}`}
          >
            {primaryActionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}