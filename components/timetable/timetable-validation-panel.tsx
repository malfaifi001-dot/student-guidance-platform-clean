"use client";

import { useState } from "react";

type ValidationIssue = {
  level: "ERROR" | "WARNING";
  code: string;
  message: string;
  entityId?: string;
};

type ValidationSummary = {
  ready: boolean;
  errorsCount: number;
  warningsCount: number;
  teachersCount: number;
  classesCount: number;
  subjectsCount: number;
  assignmentsCount: number;
  weeklyCapacity: number;
};

export function TimetableValidationPanel({
  projectId,
}: {
  projectId: string;
}) {
  const [issues, setIssues] = useState<
    ValidationIssue[]
  >([]);
  const [summary, setSummary] =
    useState<ValidationSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function validate() {
    setBusy(true);
    setMessage("");

    const response = await fetch(
      `/api/dashboard/principal/timetable/projects/${projectId}/validate`,
      {
        method: "POST",
      },
    );

    const result = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(
        result.error || "تعذر فحص البيانات.",
      );
      return;
    }

    setIssues(result.issues || []);
    setSummary(result.summary || null);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-950">
            فحص البيانات
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            تأكد من اكتمال البيانات قبل إنشاء الجدول.
          </p>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void validate()}
          className="rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50"
        >
          {busy ? "جارٍ الفحص..." : "فحص البيانات"}
        </button>
      </div>

      {message ? (
        <p className="mt-4 text-sm font-bold text-rose-600">
          {message}
        </p>
      ) : null}

      {summary ? (
        <div
          className={[
            "mt-5 rounded-2xl border p-4",
            summary.ready
              ? "border-emerald-200 bg-emerald-50"
              : "border-rose-200 bg-rose-50",
          ].join(" ")}
        >
          <p
            className={[
              "font-black",
              summary.ready
                ? "text-emerald-800"
                : "text-rose-800",
            ].join(" ")}
          >
            {summary.ready
              ? "البيانات جاهزة لإنشاء الجدول."
              : "توجد أخطاء يجب إصلاحها قبل التوليد."}
          </p>

          <p className="mt-2 text-sm text-slate-600">
            {summary.teachersCount} معلمين —{" "}
            {summary.classesCount} فصول —{" "}
            {summary.subjectsCount} مواد —{" "}
            {summary.assignmentsCount} علاقات تدريسية
          </p>
        </div>
      ) : null}

      {summary && !issues.length ? (
        <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
          لا توجد أخطاء أو تنبيهات.
        </p>
      ) : null}

      {issues.length ? (
        <div className="mt-5 space-y-2">
          {issues.map((issue, index) => (
            <div
              key={`${issue.code}:${issue.entityId || index}`}
              className={[
                "rounded-2xl border px-4 py-3",
                issue.level === "ERROR"
                  ? "border-rose-200 bg-rose-50"
                  : "border-amber-200 bg-amber-50",
              ].join(" ")}
            >
              <p
                className={[
                  "text-sm font-black",
                  issue.level === "ERROR"
                    ? "text-rose-800"
                    : "text-amber-800",
                ].join(" ")}
              >
                {issue.level === "ERROR"
                  ? "خطأ"
                  : "تنبيه"}
              </p>

              <p className="mt-1 text-sm text-slate-700">
                {issue.message}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}