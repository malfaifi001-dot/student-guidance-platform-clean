"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpLeft,
  BrainCircuit,
  CheckCircle2,
  FileSymlink,
  Loader2,
  Save,
  Sparkles,
} from "lucide-react";
import {
  SmartActionFeedbackModal,
  useSmartActionFeedback,
} from "@/components/ui/smart-action-feedback";

type WorkflowOption = {
  id: string;
  name: string;
  version: number;
  workflowType: string;
  status: string;
  isActive: boolean;
};

type ServiceOption = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  workflows: WorkflowOption[];
};

type InterventionRule = {
  id: string;
  title: string;
  targetServiceId: string;
  targetWorkflowId?: string | null;
  isDefault: boolean;
  isEnabled: boolean;
};

type RiskStudent = {
  key: string;
  studentId: string;
  studentName: string;
  nationalId?: string | null;
  grade?: string | null;
  classroom?: string | null;
  averagePercentage: number;
  weakSubjects: string[];
  rowsCount: number;
};

async function readApiResponse(response: Response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      error: text || "تعذر قراءة استجابة الخادم.",
    };
  }
}

export function AssessmentInterventionAssistant({
  analysisId,
  analysisTitle,
  students,
}: {
  analysisId: string;
  analysisTitle: string;
  students: RiskStudent[];
}) {
  const router = useRouter();

  const [services, setServices] = useState<ServiceOption[]>([]);
  const [rules, setRules] = useState<InterventionRule[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");
  const [saveAsDefault, setSaveAsDefault] = useState(true);

  const {
    actionState,
    processing,
    confirmAction,
    closeActionFeedback,
    runConfirmedAction,
  } = useSmartActionFeedback();

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId),
    [services, selectedServiceId]
  );

  async function loadData() {
    setLoading(true);

    const [optionsResponse, rulesResponse] = await Promise.all([
      fetch("/api/dashboard/assessment-center/interventions/options"),
      fetch("/api/dashboard/assessment-center/interventions/rules"),
    ]);

    const optionsData = await readApiResponse(optionsResponse);
    const rulesData = await readApiResponse(rulesResponse);

    if (optionsData.success) {
      setServices(optionsData.services || []);
    }

    if (rulesData.success) {
      setRules(rulesData.rules || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleSaveRule(student: RiskStudent) {
    if (!selectedServiceId) return;

    confirmAction({
      title: "حفظ قاعدة تدخل؟",
      description:
        "سيتم حفظ اختيار الخدمة والـ Workflow كقاعدة يمكن استخدامها للحالات القادمة.",
      variant: "info",
      confirmLabel: "حفظ القاعدة",
      errorTitle: "تعذر حفظ القاعدة",
      run: async () => {
        const response = await fetch(
          "/api/dashboard/assessment-center/interventions/rules",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: `تدخل ضعف دراسي - ${selectedService?.name || "خدمة"}`,
              sourceType: "ASSESSMENT_RISK_STUDENT",
              interventionType: "ACADEMIC_RISK",
              targetServiceId: selectedServiceId,
              targetWorkflowId: selectedWorkflowId || null,
              isDefault: saveAsDefault,
              conditionJson: {
                averageBelow: 70,
                source: "assessment-center",
              },
              fieldMappingJson: {
                analysisId,
                analysisTitle,
                studentId: student.studentId,
                studentName: student.studentName,
                weakSubjects: student.weakSubjects,
                averagePercentage: student.averagePercentage,
              },
            }),
          }
        );

        const data = await readApiResponse(response);

        if (!response.ok || !data.success) {
          throw new Error(data.error || "تعذر حفظ قاعدة التدخل.");
        }

        await loadData();

        return {
          title: "تم حفظ القاعدة",
          description: "تم حفظ قاعدة التدخل الذكي بنجاح.",
          variant: "success" as const,
        };
      },
      afterSuccess: async () => {
        router.refresh();
      },
    });
  }

  return (
    <>
      <SmartActionFeedbackModal
        state={actionState}
        processing={processing}
        onClose={closeActionFeedback}
        onConfirm={runConfirmedAction}
      />

      <main className="space-y-8">
        <section className="rounded-[2rem] border border-violet-100 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-cyan-600 p-8 text-white shadow-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/15 px-4 py-2 text-sm font-black">
            <BrainCircuit className="h-4 w-4" />
            Smart Intervention Assistant
          </div>

          <h1 className="mt-5 text-4xl font-black leading-tight md:text-5xl">
            موجه التدخل الذكي
          </h1>

          <p className="mt-4 max-w-3xl text-base font-bold leading-8 text-violet-50">
            اختيار الخدمة والـ Workflow المناسب للطلاب المرتبطين المحتاجين تدخل،
            مع إمكانية حفظ الاختيار كقاعدة للحالات القادمة.
          </p>
        </section>

        {loading ? (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-600" />
            <p className="mt-4 text-sm font-black text-slate-500">
              جاري تحميل الخدمات والـ Workflows...
            </p>
          </section>
        ) : (
          <>
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">
                إعداد التدخل
              </h2>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <div>
                  <label className="text-xs font-black text-slate-500">
                    الخدمة
                  </label>
                  <select
                    value={selectedServiceId}
                    onChange={(event) => {
                      setSelectedServiceId(event.target.value);
                      setSelectedWorkflowId("");
                    }}
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none"
                  >
                    <option value="">اختر الخدمة</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500">
                    Workflow
                  </label>
                  <select
                    value={selectedWorkflowId}
                    onChange={(event) => setSelectedWorkflowId(event.target.value)}
                    disabled={!selectedService}
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none disabled:bg-slate-100"
                  >
                    <option value="">بدون Workflow محدد</option>
                    {(selectedService?.workflows || []).map((workflow) => (
                      <option key={workflow.id} value={workflow.id}>
                        {workflow.name} - v{workflow.version}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex h-12 items-center gap-3 self-end rounded-2xl border border-cyan-100 bg-cyan-50 px-4 text-sm font-black text-cyan-800">
                  <input
                    type="checkbox"
                    checked={saveAsDefault}
                    onChange={(event) => setSaveAsDefault(event.target.checked)}
                  />
                  حفظ كقاعدة للحالات القادمة
                </label>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
              <article className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-black text-slate-400">طلاب جاهزون</p>
                <p className="mt-3 text-4xl font-black text-slate-950">
                  {students.length}
                </p>
              </article>

              <article className="rounded-[1.7rem] border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
                <p className="text-sm font-black text-emerald-500">قواعد محفوظة</p>
                <p className="mt-3 text-4xl font-black text-emerald-700">
                  {rules.length}
                </p>
              </article>

              <article className="rounded-[1.7rem] border border-violet-100 bg-violet-50 p-5 shadow-sm">
                <p className="text-sm font-black text-violet-500">الخدمات المتاحة</p>
                <p className="mt-3 text-4xl font-black text-violet-700">
                  {services.length}
                </p>
              </article>
            </section>

            <section className="space-y-4">
              {students.length === 0 ? (
                <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
                  <h2 className="mt-4 text-xl font-black text-slate-950">
                    لا يوجد طلاب جاهزون للتدخل
                  </h2>
                  <p className="mt-2 text-sm font-bold text-slate-500">
                    يجب أن يكون الطالب مربوطًا ولديه مؤشر ضعف أو خطر.
                  </p>
                </div>
              ) : null}

              {students.map((student) => (
                <article
                  key={student.key}
                  className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        مربوط وجاهز
                      </div>

                      <h2 className="mt-3 text-2xl font-black text-slate-950">
                        {student.studentName}
                      </h2>

                      <div className="mt-3 grid gap-2 text-sm font-bold text-slate-500 md:grid-cols-2">
                        <p>الهوية: {student.nationalId || "غير موجودة"}</p>
                        <p>الصف: {student.grade || "غير محدد"}</p>
                        <p>الفصل: {student.classroom || "غير محدد"}</p>
                        <p>المتوسط: {student.averagePercentage}%</p>
                      </div>

                      <p className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-bold leading-7 text-rose-800">
                        المواد الضعيفة:{" "}
                        {student.weakSubjects.length
                          ? student.weakSubjects.join("، ")
                          : "غير محدد"}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={!selectedServiceId || processing}
                      onClick={() => handleSaveRule(student)}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300 lg:w-[220px]"
                    >
                      <Save className="h-4 w-4" />
                      حفظ قاعدة تدخل
                    </button>
                  </div>
                </article>
              ))}
            </section>
          </>
        )}
      </main>
    </>
  );
}