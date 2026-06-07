"use client";

import { useCallback, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  X,
  XCircle,
} from "lucide-react";

export type SmartActionVariant =
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "error";

type SmartActionMode = "feedback" | "confirm";

type SmartActionRunResult = {
  title?: string;
  description?: string;
  variant?: SmartActionVariant;
};

type SmartActionState = {
  open: boolean;
  mode: SmartActionMode;
  title: string;
  description?: string;
  variant: SmartActionVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  run?: () => Promise<void | SmartActionRunResult> | void | SmartActionRunResult;
  successTitle?: string;
  successDescription?: string;
  errorTitle?: string;
  afterSuccess?: () => void | Promise<void>;
};

type ShowFeedbackInput = {
  title: string;
  description?: string;
  variant?: SmartActionVariant;
};

type ConfirmActionInput = {
  title: string;
  description: string;
  variant?: Exclude<SmartActionVariant, "success" | "error"> | "danger";
  confirmLabel?: string;
  cancelLabel?: string;
  run: () => Promise<void | SmartActionRunResult> | void | SmartActionRunResult;
  successTitle?: string;
  successDescription?: string;
  errorTitle?: string;
  afterSuccess?: () => void | Promise<void>;
};

const emptyActionState: SmartActionState = {
  open: false,
  mode: "feedback",
  title: "",
  variant: "info",
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "حدث خطأ غير متوقع أثناء تنفيذ العملية.";
}

function getVariantClasses(variant: SmartActionVariant) {
  if (variant === "success") {
    return {
      iconWrap: "bg-emerald-50 text-emerald-600 ring-emerald-100",
      title: "text-slate-950",
      confirm: "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-100",
      border: "from-emerald-400 to-sky-300",
    };
  }

  if (variant === "danger" || variant === "error") {
    return {
      iconWrap: "bg-rose-50 text-rose-600 ring-rose-100",
      title: "text-slate-950",
      confirm: "bg-rose-600 hover:bg-rose-700 focus:ring-rose-100",
      border: "from-rose-400 to-amber-300",
    };
  }

  if (variant === "warning") {
    return {
      iconWrap: "bg-amber-50 text-amber-600 ring-amber-100",
      title: "text-slate-950",
      confirm: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-100",
      border: "from-amber-300 to-rose-300",
    };
  }

  return {
    iconWrap: "bg-sky-50 text-sky-600 ring-sky-100",
    title: "text-slate-950",
    confirm: "bg-sky-600 hover:bg-sky-700 focus:ring-sky-100",
    border: "from-sky-400 to-cyan-300",
  };
}

function VariantIcon({ variant }: { variant: SmartActionVariant }) {
  if (variant === "success") return <CheckCircle2 className="h-6 w-6" />;
  if (variant === "danger" || variant === "error") {
    return <XCircle className="h-6 w-6" />;
  }
  if (variant === "warning") return <AlertTriangle className="h-6 w-6" />;

  return <Info className="h-6 w-6" />;
}

export function useSmartActionFeedback() {
  const [state, setState] = useState<SmartActionState>(emptyActionState);
  const [processing, setProcessing] = useState(false);

  const close = useCallback(() => {
    if (processing) return;
    setState(emptyActionState);
  }, [processing]);

  const showFeedback = useCallback((input: ShowFeedbackInput) => {
    setState({
      open: true,
      mode: "feedback",
      title: input.title,
      description: input.description,
      variant: input.variant || "info",
      confirmLabel: "تم",
    });
  }, []);

  const confirmAction = useCallback((input: ConfirmActionInput) => {
    setState({
      open: true,
      mode: "confirm",
      title: input.title,
      description: input.description,
      variant: input.variant || "warning",
      confirmLabel: input.confirmLabel || "تأكيد",
      cancelLabel: input.cancelLabel || "إلغاء",
      run: input.run,
      successTitle: input.successTitle,
      successDescription: input.successDescription,
      errorTitle: input.errorTitle,
      afterSuccess: input.afterSuccess,
    });
  }, []);

  const runConfirmedAction = useCallback(async () => {
    if (!state.run) return;

    setProcessing(true);

    try {
      const actionResult = await state.run();
      const resultFeedback =
        actionResult && typeof actionResult === "object"
          ? (actionResult as SmartActionRunResult)
          : null;

      const afterSuccess = state.afterSuccess;

      setState({
        open: true,
        mode: "feedback",
        title: resultFeedback?.title || state.successTitle || "تم تنفيذ العملية",
        description:
          resultFeedback?.description ||
          state.successDescription ||
          "تم تنفيذ الإجراء بنجاح.",
        variant: resultFeedback?.variant || "success",
        confirmLabel: "تم",
      });

      if (afterSuccess) {
        await afterSuccess();
      }
    } catch (error) {
      setState({
        open: true,
        mode: "feedback",
        title: state.errorTitle || "تعذر تنفيذ العملية",
        description: getErrorMessage(error),
        variant: "error",
        confirmLabel: "إغلاق",
      });
    } finally {
      setProcessing(false);
    }
  }, [state]);

  return {
    actionState: state,
    processing,
    closeActionFeedback: close,
    showFeedback,
    confirmAction,
    runConfirmedAction,
  };
}

export function SmartActionFeedbackModal({
  state,
  processing,
  onClose,
  onConfirm,
}: {
  state: SmartActionState;
  processing?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!state.open) return null;

  const classes = getVariantClasses(state.variant);
  const isConfirm = state.mode === "confirm";

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
    >
      <section className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 text-right shadow-2xl shadow-slate-950/20">
        <div
          className={[
            "absolute inset-x-0 top-0 h-1 bg-gradient-to-l",
            classes.border,
          ].join(" ")}
        />

        <button
          type="button"
          onClick={onClose}
          disabled={processing}
          className="absolute left-4 top-4 grid h-9 w-9 place-items-center rounded-2xl bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="إغلاق"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className={[
            "mx-auto grid h-16 w-16 place-items-center rounded-full ring-1",
            classes.iconWrap,
          ].join(" ")}
        >
          <VariantIcon variant={state.variant} />
        </div>

        <div className="mt-5 text-center">
          <h2 className={["text-2xl font-black", classes.title].join(" ")}>
            {state.title}
          </h2>

          {state.description ? (
            <p className="mx-auto mt-3 max-w-md text-sm font-bold leading-7 text-slate-500">
              {state.description}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          {isConfirm ? (
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-6 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state.cancelLabel || "إلغاء"}
            </button>
          ) : null}

          <button
            type="button"
            onClick={isConfirm ? onConfirm : onClose}
            disabled={processing}
            className={[
              "inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-7 text-sm font-black text-white shadow-lg transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60",
              classes.confirm,
            ].join(" ")}
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isConfirm
              ? state.confirmLabel || "تأكيد"
              : state.confirmLabel || "تم"}
          </button>
        </div>
      </section>
    </div>
  );
}