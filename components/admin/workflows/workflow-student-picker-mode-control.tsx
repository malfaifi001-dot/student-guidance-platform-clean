"use client";

import { CheckCircle2, Loader2, UserRoundSearch } from "lucide-react";
import { useMemo, useState } from "react";

type StudentPickerMode = "SERVICE_DEFAULT" | "REQUIRED" | "DISABLED";

type WorkflowStudentPickerModeControlProps = {
  serviceSlug: string;
  workflowId: string;
  workflowName: string;
  initialMode?: StudentPickerMode | string | null;
  disabled?: boolean;
  isActive?: boolean;
};

const studentPickerModeOptions: Array<{
  value: StudentPickerMode;
  label: string;
  description: string;
}> = [
  {
    value: "SERVICE_DEFAULT",
    label: "حسب إعداد الخدمة",
    description: "يستخدم الإعداد الافتراضي للخدمة.",
  },
  {
    value: "REQUIRED",
    label: "يتطلب اختيار طالب",
    description: "يظهر Smart Picker ويمنع المتابعة بدون طالب.",
  },
  {
    value: "DISABLED",
    label: "لا يتطلب اختيار طالب",
    description: "يخفي اختيار الطالب لهذا الـ Workflow.",
  },
];

function normalizeMode(value: unknown): StudentPickerMode {
  return value === "REQUIRED" || value === "DISABLED"
    ? value
    : "SERVICE_DEFAULT";
}

export function WorkflowStudentPickerModeControl({
  serviceSlug,
  workflowId,
  workflowName,
  initialMode,
  disabled = false,
  isActive = false,
}: WorkflowStudentPickerModeControlProps) {
  const normalizedInitialMode = useMemo(
    () => normalizeMode(initialMode),
    [initialMode],
  );

  const [mode, setMode] = useState<StudentPickerMode>(normalizedInitialMode);
  const [savedMode, setSavedMode] =
    useState<StudentPickerMode>(normalizedInitialMode);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isDirty = mode !== savedMode;

  async function saveMode() {
    if (disabled || saving || !isDirty) return;

    try {
      setSaving(true);
      setMessage(null);
      setError(null);

      const response = await fetch(
        `/api/dashboard/admin/workflows/${serviceSlug}/student-picker-mode`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workflowId,
            studentPickerMode: mode,
          }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "تعذر حفظ إعداد اختيار الطالب.");
      }

      setSavedMode(mode);
      setMessage("تم حفظ إعداد اختيار الطالب.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sky-700 ring-1 ring-sky-100">
            <UserRoundSearch className="h-5 w-5" />
          </span>

          <div>
            <p className="text-xs font-black text-sky-700">
              اختيار الطالب الذكي
            </p>

            <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
              تحكم بظهور Smart Picker لهذا الـ Workflow.
            </p>

            {isActive ? (
              <p className="mt-1 text-[11px] font-black text-emerald-700">
                هذا Workflow مفعل حاليًا؛ أي تعديل هنا يؤثر على تجربة الموجهين.
              </p>
            ) : null}

            {disabled ? (
              <p className="mt-1 text-[11px] font-black text-slate-500">
                Workflow مؤرشف؛ الإعداد للعرض فقط.
              </p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={saveMode}
          disabled={disabled || saving || !isDirty}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-700 px-4 py-2 text-xs font-black text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          title={`حفظ إعداد اختيار الطالب لـ ${workflowName}`}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isDirty ? (
            <UserRoundSearch className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {isDirty ? "حفظ الإعداد" : "محفوظ"}
        </button>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {studentPickerModeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              setMode(option.value);
              setMessage(null);
              setError(null);
            }}
            disabled={disabled || saving}
            className={[
              "rounded-2xl border p-3 text-right transition disabled:cursor-not-allowed disabled:opacity-60",
              mode === option.value
                ? "border-sky-300 bg-white text-sky-800 ring-2 ring-sky-100"
                : "border-slate-200 bg-white/70 text-slate-600 hover:bg-white",
            ].join(" ")}
          >
            <p className="text-xs font-black">{option.label}</p>
            <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
              {option.description}
            </p>
          </button>
        ))}
      </div>

      {message ? (
        <div className="mt-3 rounded-2xl bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-2xl bg-rose-50 px-4 py-2 text-xs font-black text-rose-700 ring-1 ring-rose-100">
          {error}
        </div>
      ) : null}
    </div>
  );
}
