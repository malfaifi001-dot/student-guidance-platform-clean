"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BrainCircuit,
  FileSymlink,
  Loader2,
  Search,
  UsersRound,
} from "lucide-react";
import type {
  AssessmentInterventionPackage,
  AssessmentInterventionPackageStudent,
  AssessmentInterventionTargetType,
} from "@/lib/assessment-center/assessment-intervention-types";
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
  interventionTargetTypes?: AssessmentInterventionTargetType[];
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

type TabKey =
  | "all"
  | "student"
  | "excellence"
  | "student_group"
  | "classroom"
  | "grade"
  | "subject";

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

function unique<T>(values: T[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function getTabForTarget(targetType: AssessmentInterventionTargetType): TabKey {
  if (targetType === "STUDENT_SUPPORT") return "student";
  if (targetType === "STUDENT_EXCELLENCE") return "excellence";
  if (targetType === "STUDENT_GROUP_SUBJECT") return "student_group";
  if (targetType === "CLASSROOM_SUPPORT") return "classroom";
  if (targetType === "GRADE_SUPPORT") return "grade";
  return "subject";
}

function serviceSlugForTab(tab: TabKey, hasMultiSelection: boolean) {
  if (hasMultiSelection) return "smart-student-group-custom";
  if (tab === "student") return "smart-student-support";
  if (tab === "excellence") return "smart-student-excellence";
  if (tab === "student_group") return "smart-student-group-subject";
  if (tab === "classroom") return "smart-classroom-support";
  if (tab === "grade") return "smart-grade-support";
  if (tab === "subject") return "smart-subject-support";
  return "";
}

function targetTypesForTab(tab: TabKey, hasMultiSelection: boolean): AssessmentInterventionTargetType[] {
  if (hasMultiSelection) return ["STUDENT_GROUP_CUSTOM"];
  if (tab === "student") return ["STUDENT_SUPPORT"];
  if (tab === "excellence") return ["STUDENT_EXCELLENCE"];
  if (tab === "student_group") return ["STUDENT_GROUP_SUBJECT", "STUDENT_GROUP_CUSTOM"];
  if (tab === "classroom") return ["CLASSROOM_SUPPORT"];
  if (tab === "grade") return ["GRADE_SUPPORT"];
  if (tab === "subject") return ["SUBJECT_SUPPORT"];
  return [];
}

function targetLabel(targetType: AssessmentInterventionTargetType) {
  if (targetType === "STUDENT_SUPPORT") return "متابعة طالب";
  if (targetType === "STUDENT_EXCELLENCE") return "متابعة طالب";
  if (targetType === "STUDENT_GROUP_SUBJECT") return "خطة جماعية";
  if (targetType === "STUDENT_GROUP_CUSTOM") return "خطة جماعية";
  if (targetType === "CLASSROOM_SUPPORT") return "خطة فصل";
  if (targetType === "GRADE_SUPPORT") return "خطة فصل";
  return "خطة مادة";
}

function isSelectableIndividual(item: AssessmentInterventionPackage) {
  return (
    item.targetType === "STUDENT_SUPPORT" ||
    item.targetType === "STUDENT_EXCELLENCE"
  );
}

function buildCustomGroupPackage(
  selected: AssessmentInterventionPackage[],
): AssessmentInterventionPackage | null {
  if (selected.length < 2) return null;

  const studentsMap = new Map<string, AssessmentInterventionPackageStudent>();

  for (const item of selected) {
    for (const student of item.students) {
      studentsMap.set(student.id, student);
    }
  }

  const students = Array.from(studentsMap.values());
  const subjects = unique(selected.flatMap((item) => item.subjects));
  const grades = unique(selected.flatMap((item) => item.grades));
  const classrooms = unique(selected.flatMap((item) => item.classrooms));
  const averagePercentage = average(selected.map((item) => item.averagePercentage));

  return {
    id: `student-group-custom:${students.map((student) => student.id).join("-")}`,
    targetType: "STUDENT_GROUP_CUSTOM",
    title: `خطة جماعية - ${students.length} طلاب`,
    description: "تم تجميع الطلاب المحددين في خطة واحدة.",
    recommendedAction: "أنشئ خطة جماعية لهؤلاء الطلاب.",
    riskLevel: averagePercentage < 50 ? "HIGH" : "MEDIUM",
    primaryStudentId: null,
    students,
    subjects,
    grades,
    classrooms,
    averagePercentage,
    rowsCount: selected.reduce((sum, item) => sum + item.rowsCount, 0),
  };
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-black text-slate-400">{label}</p>
      <p className="mt-3 text-4xl font-black text-slate-950">{value}</p>
    </article>
  );
}

export function AssessmentInterventionAssistant({
  analysisId,
  analysisTitle,
  packages,
}: {
  analysisId: string;
  analysisTitle: string;
  packages: AssessmentInterventionPackage[];
}) {
  const router = useRouter();

  const [services, setServices] = useState<ServiceOption[]>([]);
  const [rules, setRules] = useState<InterventionRule[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");
  const [saveAsDefault, setSaveAsDefault] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [query, setQuery] = useState("");
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);

  const {
    actionState,
    processing,
    confirmAction,
    closeActionFeedback,
    runConfirmedAction,
  } = useSmartActionFeedback();

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId),
    [services, selectedServiceId],
  );

  const visibleWorkflows = useMemo(() => {
    const workflows = selectedService?.workflows || [];
    const allowedTypes = targetTypesForTab(activeTab, selectedPackageIds.length >= 2);

    if (!allowedTypes.length) return workflows;

    return workflows.filter((workflow) => {
      if (!workflow.interventionTargetTypes?.length) return true;

      return workflow.interventionTargetTypes.some((targetType) =>
        allowedTypes.includes(targetType),
      );
    });
  }, [selectedService, activeTab, selectedPackageIds.length]);

  const selectedIndividualPackages = useMemo(
    () =>
      packages.filter(
        (item) =>
          selectedPackageIds.includes(item.id) && isSelectableIndividual(item),
      ),
    [packages, selectedPackageIds],
  );

  const customGroupPackage = useMemo(
    () => buildCustomGroupPackage(selectedIndividualPackages),
    [selectedIndividualPackages],
  );

  const filteredPackages = packages.filter((item) => {
    const tabMatches =
      activeTab === "all" || getTabForTarget(item.targetType) === activeTab;

    if (!tabMatches) return false;

    const search = query.trim().toLowerCase();
    if (!search) return true;

    const content = [
      item.title,
      item.description,
      item.recommendedAction,
      item.subjects.join(" "),
      item.grades.join(" "),
      item.classrooms.join(" "),
      item.students.map((student) => student.name).join(" "),
    ]
      .join(" ")
      .toLowerCase();

    return content.includes(search);
  });

  async function loadData() {
    setLoading(true);

    const [optionsResponse, rulesResponse] = await Promise.all([
      fetch("/api/dashboard/assessment-center/interventions/options"),
      fetch("/api/dashboard/assessment-center/interventions/rules"),
    ]);

    const optionsData = await readApiResponse(optionsResponse);
    const rulesData = await readApiResponse(rulesResponse);

    if (optionsData.success) setServices(optionsData.services || []);
    if (rulesData.success) setRules(rulesData.rules || []);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const slug = serviceSlugForTab(activeTab, selectedPackageIds.length >= 2);
    if (!slug || services.length === 0) return;

    const service = services.find((item) => item.slug === slug);
    if (!service || selectedServiceId === service.id) return;

    setSelectedServiceId(service.id);
    setSelectedWorkflowId("");
  }, [activeTab, selectedPackageIds.length, services, selectedServiceId]);

  function togglePackageSelection(item: AssessmentInterventionPackage) {
    if (!isSelectableIndividual(item)) return;

    setSelectedPackageIds((current) =>
      current.includes(item.id)
        ? current.filter((id) => id !== item.id)
        : [...current, item.id],
    );
  }

  function handleCreateCase(item: AssessmentInterventionPackage) {
    if (!selectedServiceId || !selectedWorkflowId) return;

    let nextUrl = "";

    confirmAction({
      title: "إنشاء خطة",
      description: `سيتم إنشاء الخطة "${item.title}".`,
      variant: "info",
      confirmLabel: "إنشاء خطة",
      errorTitle: "تعذر إنشاء الخطة",
      run: async () => {
        const response = await fetch(
          "/api/dashboard/assessment-center/interventions/create-case",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              analysisId,
              analysisTitle,
              package: item,
              targetServiceId: selectedServiceId,
              targetWorkflowId: selectedWorkflowId,
              saveAsDefault,
            }),
          },
        );

        const data = await readApiResponse(response);

        if (!response.ok || !data.success) {
          throw new Error(data.error || "تعذر إنشاء الخطة.");
        }

        nextUrl = data.caseUrl;

        return {
          title: "تم إنشاء الخطة",
          description: "سيتم نقلك إلى صفحة الخطة.",
          variant: "success" as const,
        };
      },
      afterSuccess: async () => {
        if (nextUrl) router.push(nextUrl);
      },
    });
  }

  const tabs = [
    { key: "all" as const, label: "الكل", count: packages.length },
    {
      key: "student" as const,
      label: "متابعة طالب",
      count: packages.filter((p) => p.targetType === "STUDENT_SUPPORT").length,
    },
    {
      key: "excellence" as const,
      label: "تعزيز",
      count: packages.filter((p) => p.targetType === "STUDENT_EXCELLENCE").length,
    },
    {
      key: "student_group" as const,
      label: "خطة جماعية",
      count: packages.filter((p) => p.targetType === "STUDENT_GROUP_SUBJECT").length,
    },
    {
      key: "classroom" as const,
      label: "الفصول",
      count: packages.filter((p) => p.targetType === "CLASSROOM_SUPPORT").length,
    },
    {
      key: "grade" as const,
      label: "الصفوف",
      count: packages.filter((p) => p.targetType === "GRADE_SUPPORT").length,
    },
    {
      key: "subject" as const,
      label: "المواد",
      count: packages.filter((p) => p.targetType === "SUBJECT_SUPPORT").length,
    },
  ];

  return (
    <>
      <SmartActionFeedbackModal
        state={actionState}
        processing={processing}
        onClose={closeActionFeedback}
        onConfirm={runConfirmedAction}
      />

      <main className="space-y-8">
        <section className="rounded-[2rem] border border-cyan-100 bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700 p-8 text-white shadow-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/15 px-4 py-2 text-sm font-black">
            <BrainCircuit className="h-4 w-4" />
            الموجه الذكي
          </div>

          <h1 className="mt-5 text-4xl font-black leading-tight md:text-5xl">
            {analysisTitle}
          </h1>

          <p className="mt-4 max-w-3xl text-base font-bold leading-8 text-cyan-50">
            اختر الخطة المناسبة ثم افتحها.
          </p>
        </section>

        {loading ? (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-600" />
          </section>
        ) : (
          <>
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">
                اختيار الخطة
              </h2>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <div>
                  <label className="text-xs font-black text-slate-500">الخدمة</label>
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
                  <label className="text-xs font-black text-slate-500">الخطة</label>
                  <select
                    value={selectedWorkflowId}
                    onChange={(event) => setSelectedWorkflowId(event.target.value)}
                    disabled={!selectedService}
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none disabled:bg-slate-100"
                  >
                    <option value="">اختر الخطة</option>
                    {visibleWorkflows.map((workflow) => (
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
                  حفظ هذا الاختيار للاستخدام لاحقًا
                </label>
              </div>
            </section>

            {selectedIndividualPackages.length > 0 ? (
              <section className="rounded-[2rem] border border-amber-100 bg-amber-50 p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-xl font-black text-amber-950">
                      خطة جماعية للمحددين
                    </h2>
                    <p className="mt-2 text-sm font-bold text-amber-800">
                      تم تحديد {selectedIndividualPackages.length} طالب/طلاب.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPackageIds([])}
                      className="h-11 rounded-2xl bg-white px-4 text-xs font-black text-amber-700"
                    >
                      مسح التحديد
                    </button>

                    <button
                      type="button"
                      disabled={
                        !customGroupPackage ||
                        !selectedServiceId ||
                        !selectedWorkflowId ||
                        processing
                      }
                      onClick={() => customGroupPackage && handleCreateCase(customGroupPackage)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-amber-600 px-5 text-xs font-black text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <FileSymlink className="h-4 w-4" />
                      إنشاء خطة جماعية
                    </button>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="grid gap-4 md:grid-cols-3">
              <StatCard label="الخطط المقترحة" value={packages.length} />
              <StatCard label="القواعد" value={rules.length} />
              <StatCard label="الخدمات" value={services.length} />
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.key);
                      setSelectedWorkflowId("");
                    }}
                    className={[
                      "rounded-2xl px-4 py-2 text-xs font-black transition",
                      activeTab === tab.key
                        ? "bg-cyan-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                    ].join(" ")}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4">
                <Search className="h-5 w-5 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ابحث في الخطط..."
                  className="h-12 flex-1 bg-transparent text-sm font-bold outline-none"
                />
              </div>
            </section>

            <section className="space-y-4">
              {filteredPackages.length === 0 ? (
                <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
                  <UsersRound className="mx-auto h-10 w-10 text-slate-300" />
                  <h2 className="mt-4 text-xl font-black text-slate-950">
                    لا توجد خطط في هذا التصنيف
                  </h2>
                </div>
              ) : null}

              {filteredPackages.map((item) => {
                const selectable = isSelectableIndividual(item);
                const selected = selectedPackageIds.includes(item.id);

                return (
                  <article
                    key={item.id}
                    className={[
                      "rounded-[2rem] border bg-white p-5 shadow-sm transition",
                      selected ? "border-amber-300 ring-2 ring-amber-200" : "border-slate-200",
                    ].join(" ")}
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {selectable ? (
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => togglePackageSelection(item)}
                              />
                              تحديد
                            </label>
                          ) : null}

                          <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                            {targetLabel(item.targetType)}
                          </span>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                            {item.students.length} طالب
                          </span>

                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                            متوسط {item.averagePercentage}%
                          </span>
                        </div>

                        <h2 className="mt-3 text-2xl font-black text-slate-950">
                          {item.title}
                        </h2>

                        <p className="mt-3 text-sm font-bold leading-8 text-slate-500">
                          {item.description}
                        </p>

                        <div className="mt-4 grid gap-2 text-sm font-bold text-slate-500 md:grid-cols-3">
                          <p>المواد: {item.subjects.join("، ") || "غير محدد"}</p>
                          <p>الصفوف: {item.grades.join("، ") || "غير محدد"}</p>
                          <p>الفصول: {item.classrooms.join("، ") || "غير محدد"}</p>
                        </div>

                        <p className="mt-4 rounded-2xl bg-cyan-50 p-4 text-sm font-bold leading-7 text-cyan-900">
                          {item.recommendedAction}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={!selectedServiceId || !selectedWorkflowId || processing}
                        onClick={() => handleCreateCase(item)}
                        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 text-sm font-black text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300 lg:w-[220px]"
                      >
                        <FileSymlink className="h-4 w-4" />
                        إنشاء خطة
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          </>
        )}
      </main>
    </>
  );
}
