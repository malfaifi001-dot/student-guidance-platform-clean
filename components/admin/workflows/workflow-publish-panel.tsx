"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Eye,
  FileStack,
  Loader2,
  PencilLine,
  Rocket,
  UserRoundSearch,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  normalizeWorkflowEvidenceMode,
  normalizeWorkflowStudentPickerMode,
  type WorkflowEvidenceMode,
  type WorkflowStudentPickerMode,
} from "@/lib/workflows/workflow-runtime-settings";

type WorkflowPublishPanelProps = {
  serviceSlug: string;
  previewHref: string;
  hasDraft: boolean;
  draftWorkflowId?: string | null;
  draftWorkflowName?: string | null;
  draftVersion?: number | null;
  activeWorkflowName?: string | null;
};

const studentPickerModeOptions: Array<{
  value: WorkflowStudentPickerMode;
  label: string;
  description: string;
}> = [
  {
    value: "SERVICE_DEFAULT",
    label: "حسب إعداد الخدمة",
    description: "يستخدم الإعداد الحالي للخدمة بدون فرض جديد.",
  },
  {
    value: "REQUIRED",
    label: "يتطلب اختيار طالب",
    description: "يظهر Smart Picker ويمنع المتابعة بدون طالب.",
  },
  {
    value: "DISABLED",
    label: "لا يتطلب اختيار طالب",
    description: "يخفي اختيار الطالب حتى لو كانت الخدمة تدعمه افتراضيًا.",
  },
];

const evidenceModeOptions: Array<{
  value: WorkflowEvidenceMode;
  label: string;
  description: string;
}> = [
  {
    value: "SERVICE_DEFAULT",
    label: "حسب إعداد الخدمة",
    description: "يستخدم سلوك الخدمة الافتراضي أو خطوة الشواهد داخل النموذج.",
  },
  {
    value: "ENABLED",
    label: "تفعيل الشواهد",
    description: "يعرض رفع الشواهد لهذا الـ Workflow حتى بدون خطوة شواهد صريحة.",
  },
  {
    value: "DISABLED",
    label: "تعطيل الشواهد",
    description: "يخفي الشواهد لهذا الـ Workflow حتى لو كانت الخدمة تدعمها.",
  },
];

export function WorkflowPublishPanel({
  serviceSlug,
  previewHref,
  hasDraft,
  draftWorkflowId,
  draftWorkflowName,
  draftVersion,
  activeWorkflowName,
}: WorkflowPublishPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [savingStudentPickerMode, setSavingStudentPickerMode] = useState(false);
  const [savingEvidenceMode, setSavingEvidenceMode] = useState(false);
  const [draftName, setDraftName] = useState(draftWorkflowName || "");
  const [studentPickerMode, setStudentPickerMode] =
    useState<WorkflowStudentPickerMode>("SERVICE_DEFAULT");
  const [evidenceMode, setEvidenceMode] =
    useState<WorkflowEvidenceMode>("SERVICE_DEFAULT");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraftName(draftWorkflowName || "");
  }, [draftWorkflowName]);

  useEffect(() => {
    if (!draftWorkflowId || !hasDraft) {
      setStudentPickerMode("SERVICE_DEFAULT");
      setEvidenceMode("SERVICE_DEFAULT");
      return;
    }

    let cancelled = false;
    const workflowId = draftWorkflowId;

    async function loadWorkflowRuntimeSettings() {
      try {
        const [studentPickerResponse, evidenceResponse] = await Promise.all([
          fetch(
            `/api/dashboard/admin/workflows/${serviceSlug}/student-picker-mode?workflowId=${encodeURIComponent(workflowId)}`,
            { cache: "no-store" },
          ),
          fetch(
            `/api/dashboard/admin/workflows/${serviceSlug}/evidence-mode?workflowId=${encodeURIComponent(workflowId)}`,
            { cache: "no-store" },
          ),
        ]);

        if (!studentPickerResponse.ok && !evidenceResponse.ok) {
          return;
        }

        const studentPickerData = studentPickerResponse.ok
          ? await studentPickerResponse.json()
          : null;
        const evidenceData = evidenceResponse.ok
          ? await evidenceResponse.json()
          : null;

        if (!cancelled) {
          setStudentPickerMode(
            normalizeWorkflowStudentPickerMode(
              studentPickerData?.workflow?.studentPickerMode,
            ),
          );
          setEvidenceMode(
            normalizeWorkflowEvidenceMode(evidenceData?.workflow?.evidenceMode),
          );
        }
      } catch {
        if (!cancelled) {
          setStudentPickerMode("SERVICE_DEFAULT");
          setEvidenceMode("SERVICE_DEFAULT");
        }
      }
    }

    loadWorkflowRuntimeSettings();

    return () => {
      cancelled = true;
    };
  }, [draftWorkflowId, hasDraft, serviceSlug]);

  async function saveDraftName() {
    if (!draftWorkflowId || !draftName.trim()) return;

    try {
      setSavingName(true);
      setMessage(null);
      setError(null);

      const response = await fetch(
        `/api/dashboard/admin/workflows/${serviceSlug}/draft-name`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workflowId: draftWorkflowId,
            name: draftName,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر تحديث اسم المسودة.");
      }

      setMessage("تم تحديث اسم المسودة.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع.");
    } finally {
      setSavingName(false);
    }
  }

  async function saveStudentPickerMode() {
    if (!draftWorkflowId) return;

    try {
      setSavingStudentPickerMode(true);
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
            workflowId: draftWorkflowId,
            studentPickerMode,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر حفظ إعداد اختيار الطالب.");
      }

      setMessage("تم حفظ إعداد اختيار الطالب للمسودة.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع.");
    } finally {
      setSavingStudentPickerMode(false);
    }
  }

  async function saveEvidenceMode() {
    if (!draftWorkflowId) return;

    try {
      setSavingEvidenceMode(true);
      setMessage(null);
      setError(null);

      const response = await fetch(
        `/api/dashboard/admin/workflows/${serviceSlug}/evidence-mode`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workflowId: draftWorkflowId,
            evidenceMode,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر حفظ إعداد الشواهد.");
      }

      setMessage("تم حفظ إعداد الشواهد للمسودة.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع.");
    } finally {
      setSavingEvidenceMode(false);
    }
  }

  async function publishWorkflow() {
    try {
      setLoading(true);
      setMessage(null);
      setError(null);

      const response = await fetch(
        `/api/dashboard/admin/workflows/${serviceSlug}/publish`,
        {
          method: "POST",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر نشر Workflow.");
      }

      setMessage("تم نشر آخر مسودة Workflow وتفعيلها للموجهين.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-5 xl:grid-cols-[1fr_520px] xl:items-center">
        <div>
          <p className="text-xs font-black text-sky-700">
            الاعتماد والنشر
          </p>

          <h2 className="mt-1 text-2xl font-black text-slate-950">
            راجع المسودة ثم انشرها للموجهين
          </h2>

          <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-500">
            النشر يعطل النسخة السابقة ويُفعل المسودة الجديدة. الحالات القديمة
            لا تتغير لأنها تحتفظ بنسخة Snapshot عند إنشائها.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {activeWorkflowName ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                المفعل حاليًا: {activeWorkflowName}
              </span>
            ) : (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-100">
                لا يوجد Workflow مفعل
              </span>
            )}

            {hasDraft ? (
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
                Draft جاهز
                {draftVersion ? ` · V${draftVersion}` : ""}
              </span>
            ) : (
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                لا توجد مسودة جاهزة للنشر
              </span>
            )}
          </div>

          {message ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800 ring-1 ring-emerald-100">
              <CheckCircle2 className="h-4 w-4" />
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 ring-1 ring-rose-100">
              {error}
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          {hasDraft ? (
            <>
              <div className="rounded-3xl bg-slate-50 p-3">
                <label className="text-xs font-black text-slate-500">
                  اسم المسودة قبل النشر
                </label>

                <div className="mt-2 flex gap-2">
                  <input
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-sky-400"
                  />

                  <button
                    type="button"
                    onClick={saveDraftName}
                    disabled={savingName || !draftWorkflowId || !draftName.trim()}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    {savingName ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <PencilLine className="h-4 w-4" />
                    )}
                    حفظ الاسم
                  </button>
                </div>
              </div>

              <div className="rounded-3xl bg-slate-50 p-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <UserRoundSearch className="h-5 w-5" />
                  </span>

                  <div>
                    <p className="text-xs font-black text-slate-500">
                      اختيار الطالب الذكي
                    </p>
                    <p className="mt-1 text-sm font-bold leading-6 text-slate-600">
                      حدد هل هذا الـ Workflow يحتاج Smart Picker أم لا.
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid gap-2">
                  {studentPickerModeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setStudentPickerMode(option.value)}
                      className={[
                        "rounded-2xl border p-3 text-right transition",
                        studentPickerMode === option.value
                          ? "border-sky-300 bg-sky-50 ring-2 ring-sky-100"
                          : "border-slate-200 bg-white hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <p className="text-sm font-black text-slate-900">
                        {option.label}
                      </p>
                      <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                        {option.description}
                      </p>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={saveStudentPickerMode}
                  disabled={savingStudentPickerMode || !draftWorkflowId}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-white px-4 py-3 text-xs font-black text-sky-700 transition hover:bg-sky-50 disabled:opacity-50"
                >
                  {savingStudentPickerMode ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserRoundSearch className="h-4 w-4" />
                  )}
                  حفظ إعداد اختيار الطالب
                </button>
              </div>

              <div className="rounded-3xl bg-slate-50 p-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <FileStack className="h-5 w-5" />
                  </span>

                  <div>
                    <p className="text-xs font-black text-slate-500">
                      الشواهد
                    </p>
                    <p className="mt-1 text-sm font-bold leading-6 text-slate-600">
                      تحكم بظهور الشواهد لهذا الـ Workflow.
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid gap-2">
                  {evidenceModeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setEvidenceMode(option.value)}
                      className={[
                        "rounded-2xl border p-3 text-right transition",
                        evidenceMode === option.value
                          ? "border-sky-300 bg-sky-50 ring-2 ring-sky-100"
                          : "border-slate-200 bg-white hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <p className="text-sm font-black text-slate-900">
                        {option.label}
                      </p>
                      <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                        {option.description}
                      </p>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={saveEvidenceMode}
                  disabled={savingEvidenceMode || !draftWorkflowId}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-white px-4 py-3 text-xs font-black text-sky-700 transition hover:bg-sky-50 disabled:opacity-50"
                >
                  {savingEvidenceMode ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileStack className="h-4 w-4" />
                  )}
                  حفظ إعداد الشواهد
                </button>
              </div>
            </>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              href={previewHref}
              className={[
                "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition",
                hasDraft
                  ? "bg-sky-700 text-white hover:bg-sky-800"
                  : "pointer-events-none bg-slate-100 text-slate-400",
              ].join(" ")}
              aria-disabled={!hasDraft}
            >
              <Eye className="h-4 w-4" />
              معاينة الموجه
            </Link>

            <button
              type="button"
              onClick={publishWorkflow}
              disabled={!hasDraft || loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              نشر Workflow
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
