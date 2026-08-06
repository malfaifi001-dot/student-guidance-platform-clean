"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { SmartFeedbackModal } from "@/components/service-ui/smart-feedback-modal";
import { TimetableDataCard } from "@/components/timetable/timetable-data-card";

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

      <SmartFeedbackModal
        open={Boolean(message)}
        type="error"
        title="تعذر فحص البيانات"
        description={message}
        primaryActionLabel="حسنًا"
        onOpenChange={(open) => {
          if (!open) setMessage("");
        }}
      />

      {summary ? (
        <div className="mt-5">
          <TimetableDataCard
            icon={summary.ready ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            eyebrow="نتيجة فحص الجاهزية"
            title={summary.ready ? "البيانات جاهزة لإنشاء الجدول" : "توجد أخطاء يجب إصلاحها قبل التوليد"}
            tone={summary.ready ? "emerald" : "amber"}
            badges={[summary.ready ? "جاهز" : "يتطلب معالجة"]}
            metrics={[
              { label: "المعلمون", value: summary.teachersCount },
              { label: "الفصول", value: summary.classesCount },
              { label: "المواد", value: summary.subjectsCount },
              { label: "العلاقات", value: summary.assignmentsCount },
            ]}
          />
        </div>
      ) : null}

      {summary && !issues.length ? (
        <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
          لا توجد أخطاء أو تنبيهات.
        </p>
      ) : null}

      {issues.length ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {issues.map((issue, index) => (
            <TimetableDataCard
              key={`${issue.code}:${issue.entityId || index}`}
              icon={<AlertTriangle className="h-5 w-5" />}
              eyebrow={issue.level === "ERROR" ? "خطأ مانع" : "تنبيه"}
              title={issue.message}
              tone={issue.level === "ERROR" ? "rose" : "amber"}
              badges={[issue.level === "ERROR" ? "خطأ" : "تنبيه", issue.code]}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
