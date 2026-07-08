"use client";

import {
  useState,
} from "react";

import {
  Loader2,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";

type SpecialReportAiActionsProps = {
  fieldKey: string;
  fieldLabel: string;

  value: unknown;

  onChange: (
    key: string,
    value: unknown
  ) => void;
};

type AiMode =
  | "suggest"
  | "refine";

export function SpecialReportAiActions({
  fieldKey,
  fieldLabel,
  value,
  onChange,
}: SpecialReportAiActionsProps) {
  const [loadingMode, setLoadingMode] =
    useState<AiMode | null>(null);

  const [candidate, setCandidate] =
    useState<string | null>(null);

  const [error, setError] =
    useState("");

  async function runAi(
    mode: AiMode
  ) {
    setLoadingMode(mode);
    setCandidate(null);
    setError("");

    try {
      const performanceElement =
        sessionStorage.getItem(
          "special-report-performance-element"
        ) || "";

      const reportTitle =
        sessionStorage.getItem(
          "special-report-title"
        ) || "";

      const reportContext =
        sessionStorage.getItem(
          "special-report-context"
        ) || "";

      const response = await fetch(
        "/api/dashboard/special-report/ai",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            mode,

            fieldKey,

            reportTitle,

            performanceElement,

            currentText:
              String(value ?? ""),

            reportContext,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "تعذر تنفيذ الطلب."
        );
      }

      setCandidate(
        String(data.text ?? "")
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر تنفيذ الطلب."
      );
    } finally {
      setLoadingMode(null);
    }
  }

  return (
    <>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={
            loadingMode !== null
          }
          onClick={() =>
            runAi("suggest")
          }
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 text-xs font-black text-violet-800 transition hover:bg-violet-100 disabled:opacity-50"
        >
          {loadingMode ===
          "suggest" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}

          اقترح لي
        </button>

        <button
          type="button"
          disabled={
            loadingMode !== null ||
            !String(value ?? "").trim()
          }
          onClick={() =>
            runAi("refine")
          }
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 text-xs font-black text-sky-800 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loadingMode ===
          "refine" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <WandSparkles className="h-3.5 w-3.5" />
          )}

          نقّح النص
        </button>

        {error ? (
          <span className="text-xs font-bold text-rose-600">
            {error}
          </span>
        ) : null}
      </div>

      {candidate ? (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] border border-white/40 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black text-violet-700">
                  اقتراح للمراجعة
                </p>

                <h3 className="mt-1 text-lg font-black text-slate-950">
                  {fieldLabel}
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setCandidate(null)
                }
                className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-800">
              {candidate}
            </div>

            <p className="mt-3 text-xs font-bold text-slate-500">
              لن يتم تغيير نصك تلقائيًا.
              يتم التغيير فقط بعد ضغط
              "اعتماد النص".
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setCandidate(null)
                }
                className="h-11 rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={() => {
                  onChange(
                    fieldKey,
                    candidate
                  );

                  if (
                    fieldKey ===
                    "special_report_title"
                  ) {
                    sessionStorage.setItem(
                      "special-report-title",
                      candidate
                    );
                  }

                  setCandidate(null);
                }}
                className="h-11 rounded-2xl bg-slate-950 text-sm font-black text-white hover:bg-slate-800"
              >
                اعتماد النص
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}