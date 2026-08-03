"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, CheckCircle2, X, XCircle } from "lucide-react";

type FormFeedbackModalProps = {
  open: boolean;
  type: "error" | "warning" | "success";
  title: string;
  message: string;
  primaryActionLabel: string;
  secondaryActionLabel?: string;
  onPrimaryAction: () => void;
  onClose: () => void;
};

export function FormFeedbackModal({
  open,
  type,
  title,
  message,
  primaryActionLabel,
  secondaryActionLabel,
  onPrimaryAction,
  onClose,
}: FormFeedbackModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    primaryButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key === "Tab") {
        const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
        );
        if (!focusableElements?.length) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  const styles = {
    error: {
      icon: XCircle,
      iconClass: "text-rose-600",
      iconBackground: "bg-rose-50",
      primary: "bg-rose-600 hover:bg-rose-700",
    },
    warning: {
      icon: AlertTriangle,
      iconClass: "text-amber-600",
      iconBackground: "bg-amber-50",
      primary: "bg-amber-600 hover:bg-amber-700",
    },
    success: {
      icon: CheckCircle2,
      iconClass: "text-emerald-600",
      iconBackground: "bg-emerald-50",
      primary: "bg-emerald-600 hover:bg-emerald-700",
    },
  }[type];
  const Icon = styles.icon;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="form-feedback-title"
      aria-describedby="form-feedback-message"
      dir="rtl"
    >
      <div
        ref={dialogRef}
        className="relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <X className="h-5 w-5" />
        </button>

        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${styles.iconBackground}`}
        >
          <Icon className={`h-8 w-8 ${styles.iconClass}`} />
        </div>

        <div className="mt-5 text-center">
          <h2 id="form-feedback-title" className="text-2xl font-black text-slate-950">
            {title}
          </h2>
          <p
            id="form-feedback-message"
            className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-600"
          >
            {message}
          </p>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          {secondaryActionLabel ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              {secondaryActionLabel}
            </button>
          ) : null}
          <button
            ref={primaryButtonRef}
            type="button"
            onClick={onPrimaryAction}
            className={`rounded-2xl px-6 py-3 text-sm font-black text-white outline-none transition focus:ring-4 focus:ring-slate-200 ${styles.primary}`}
          >
            {primaryActionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
