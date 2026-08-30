"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ReportCaseListItem = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;

  service: {
    id: string;
    name: string;
    slug: string;
  };

  student?: {
    id: string;
    fullName: string;
    nationalId?: string | null;
    stage?: string | null;
    grade?: string | null;
    classroom?: string | null;
    guardianName?: string | null;
    guardianPhone?: string | null;
  } | null;

  valuesCount: number;
  evidencesCount: number;
};

type PreparedReportData = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;

  service: {
    id: string;
    name: string;
    slug: string;
  };

  student?: {
    id?: string;
    fullName: string;
    nationalId?: string | null;
    stage?: string | null;
    grade?: string | null;
    classroom?: string | null;
    guardianName?: string | null;
    guardianPhone?: string | null;
  } | null;

  values: Array<{
    fieldKey: string;
    fieldLabel: string;
    value: string;
  }>;

  evidences: Array<{
    id: string;
    title: string;
    fileName: string;
    fileUrl: string;
    mimeType?: string | null;
    size?: number | null;
    note?: string | null;
    imageUrl?: string;
  }>;
};

type PrepareApiResponse =
  | {
      ok: true;
      reportData: PreparedReportData;
    }
  | {
      ok: false;
      error: string;
    };

type CreateReportApiResponse =
  | {
      success: true;
      reportId: string;
      previewUrl?: string;
    }
  | {
      success?: false;
      error: string;
    };

type ReportTemplateChoice = {
  id: string;
  name: string;
  description: string;
  bestFor: string;
  badge: string;
  serviceSlug?: string | null;
  pagesCount?: number;
  isBuilderTemplate?: boolean;
};

type PublishedReportTemplateOption = {
  id: string;
  name: string;
  description: string;
  serviceSlug: string | null;
  scope: "GLOBAL" | "SERVICE";
  status: "PUBLISHED" | string;
  pagesCount: number;
};

const REPORT_TEMPLATE_CHOICES: ReportTemplateChoice[] = [
  {
    id: "official-long",
    name: "قالب منشور",
    description: "قالب A4 رسمي مناسب للحفظ والطباعة والاعتماد.",
    bestFor: "التقارير الرسمية والملفات المعتمدة",
    badge: "رسمي",
  },
  {
    id: "visual-activity",
    name: "قالب منشور",
    description: "قالب يبرز الشواهد والصور والأنشطة بشكل أوضح.",
    bestFor: "البرامج والفعاليات والشواهد المصورة",
    badge: "بصري",
  },
  {
    id: "executive-brief",
    name: "قالب منشور",
    description: "قالب سريع يركز على أهم البيانات والنتائج.",
    bestFor: "الملخصات والتقارير السريعة",
    badge: "مختصر",
  },
];

type NewReportCasePickerProps = {
  cases: ReportCaseListItem[];
  initialCaseId?: string;
  publishedTemplates?: PublishedReportTemplateOption[];
};

export function NewReportCasePicker({
  cases,
  initialCaseId = "",
  publishedTemplates = [],
}: NewReportCasePickerProps) {
  const router = useRouter();

  const [selectedCaseId, setSelectedCaseId] = useState(initialCaseId);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const [query, setQuery] = useState("");
  const [preparedReportData, setPreparedReportData] =
    useState<PreparedReportData | null>(null);

  const [loadingPrepare, setLoadingPrepare] = useState(false);
  const [prepareError, setPrepareError] = useState("");

  const [creatingReport, setCreatingReport] = useState(false);
  const [createReportError, setCreateReportError] = useState("");

  const filteredCases = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    if (!keyword) {
      return cases;
    }

    return cases.filter((caseEntry) => {
      const searchableText = [
        caseEntry.title,
        caseEntry.status,
        caseEntry.service.name,
        caseEntry.service.slug,
        caseEntry.student?.fullName,
        caseEntry.student?.nationalId,
        caseEntry.student?.grade,
        caseEntry.student?.classroom,
        caseEntry.student?.guardianName,
        caseEntry.student?.guardianPhone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(keyword);
    });
  }, [cases, query]);

  const selectedCase = useMemo(() => {
    return cases.find((caseEntry) => caseEntry.id === selectedCaseId) || null;
  }, [cases, selectedCaseId]);

  const templateChoices = useMemo<ReportTemplateChoice[]>(() => {
    return publishedTemplates.map((template) => ({
      id: template.id,
      name: template.name,
      description:
        template.description || "قالب منشور من صانع قوالب التقارير.",
      bestFor:
        template.scope === "SERVICE"
          ? "هذا القالب مخصص لخدمة محددة."
          : "قالب عام مناسب لأكثر من خدمة.",
      badge: template.scope === "SERVICE" ? "خدمة" : "عام",
      serviceSlug: template.serviceSlug,
      pagesCount: template.pagesCount,
      isBuilderTemplate: true,
    }));
  }, [publishedTemplates]);

  const selectedTemplate = useMemo(() => {
    return (
      templateChoices.find((template) => template.id === selectedTemplateId) ||
      templateChoices[0] ||
      REPORT_TEMPLATE_CHOICES[0]
    );
  }, [templateChoices, selectedTemplateId]);

  useEffect(() => {
    if (!templateChoices.length) {
      return;
    }

    if (!templateChoices.some((template) => template.id === selectedTemplateId)) {
      setSelectedTemplateId(templateChoices[0].id);
    }
  }, [templateChoices, selectedTemplateId]);

  useEffect(() => {
    if (!selectedCaseId) {
      setPreparedReportData(null);
      setPrepareError("");
      setCreateReportError("");
      return;
    }

    const controller = new AbortController();

    async function prepareReportData() {
      try {
        setLoadingPrepare(true);
        setPrepareError("");
        setCreateReportError("");
        setPreparedReportData(null);

        const response = await fetch(
          `/api/dashboard/reports/prepare?caseId=${encodeURIComponent(
            selectedCaseId
          )}`,
          {
            signal: controller.signal,
          }
        );

        const data = (await response.json()) as PrepareApiResponse;

        if (!response.ok || !data.ok) {
          throw new Error(
            "error" in data ? data.error : "تعذر تجهيز بيانات التقارير."
          );
        }

        setPreparedReportData(data.reportData);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setPreparedReportData(null);
        setPrepareError(
          error instanceof Error
            ? error.message
            : "تعذر تجهيز بيانات التقارير."
        );
      } finally {
        setLoadingPrepare(false);
      }
    }

    prepareReportData();

    return () => {
      controller.abort();
    };
  }, [selectedCaseId]);

  async function handleCreateReport() {
    if (!selectedCaseId) {
      setCreateReportError("اختر حالة أولًا لإنشاء التقارير.");
      return;
    }

    if (!preparedReportData) {
      setCreateReportError("بيانات التقارير غير جاهزة بعد.");
      return;
    }

    try {
      setCreatingReport(true);
      setCreateReportError("");

      const response = await fetch("/api/dashboard/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caseEntryId: selectedCaseId,
          title: `تقرير - ${preparedReportData.title}`,
          templateId: selectedTemplateId,
          preparedReportData,
        }),
      });

      const data = (await response.json()) as CreateReportApiResponse;

      if (!response.ok || !("success" in data) || !data.success) {
        throw new Error("error" in data ? data.error : "تعذر إنشاء التقارير.");
      }

      router.push(
        data.previewUrl ||
          `/dashboard/report/${data.reportId}/preview?template=${selectedTemplateId}`
      );
      router.refresh();
    } catch (error) {
      setCreateReportError(
        error instanceof Error ? error.message : "تعذر إنشاء التقارير."
      );
    } finally {
      setCreatingReport(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-6" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 p-8 text-white shadow-2xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-sky-100">محرك التقارير</p>

              <h1 className="mt-3 text-3xl font-black">
                إصدار تقرير من حالة موجودة
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-sky-50">
                اختر الحالة، راجع البيانات، اختر القالب، ثم أنشئ التقارير. سيتم
                حفظ Snapshot للبيانات والقالب حتى يبقى التقارير ثابتًا لاحقًا.
              </p>
            </div>

            <Link
              href="/dashboard/report-2"
              className="rounded-2xl bg-white/15 px-4 py-3 text-sm font-black text-white transition hover:bg-white/20"
            >
              الرجوع للتقارير
            </Link>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <aside className="space-y-4">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  اختيار الحالة
                </h2>

                <p className="mt-1 text-sm leading-7 text-slate-500">
                  ابحث باسم الطالب/الطالبة أو الخدمة أو عنوان الحالة.
                </p>
              </div>

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="بحث في الحالات..."
                className="mt-4 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              />

              <div className="mt-4 flex items-center justify-between text-xs font-bold text-slate-500">
                <span>عدد الحالات</span>
                <span>{filteredCases.length}</span>
              </div>

              <div className="mt-4 max-h-[620px] space-y-3 overflow-auto pr-1">
                {filteredCases.length ? (
                  filteredCases.map((caseEntry) => (
                    <CaseSelectionButton
                      key={caseEntry.id}
                      caseEntry={caseEntry}
                      active={caseEntry.id === selectedCaseId}
                      onSelect={() => setSelectedCaseId(caseEntry.id)}
                    />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
                    لا توجد حالات مطابقة للبحث.
                  </div>
                )}
              </div>
            </section>
          </aside>

          <section className="space-y-4">
            {!selectedCase ? (
              <EmptyState />
            ) : (
              <>
                <CaseOverviewCard caseEntry={selectedCase} />

                <PreparedReportPreview
                  loading={loadingPrepare}
                  error={prepareError}
                  reportData={preparedReportData}
                />

                <ReportCreationCard
                  selectedTemplate={selectedTemplate}
                  selectedTemplateId={selectedTemplateId}
                  templates={templateChoices}
                  onTemplateChange={setSelectedTemplateId}
                  reportDataReady={Boolean(preparedReportData)}
                  creatingReport={creatingReport}
                  createReportError={createReportError}
                  onCreateReport={handleCreateReport}
                />
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function CaseSelectionButton({
  caseEntry,
  active,
  onSelect,
}: {
  caseEntry: ReportCaseListItem;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "w-full rounded-2xl border p-4 text-right transition",
        active
          ? "border-sky-400 bg-sky-50"
          : "border-slate-200 bg-white hover:bg-slate-50",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <strong className="line-clamp-1 text-sm text-slate-900">
            {caseEntry.title}
          </strong>

          <p className="mt-1 text-xs font-bold text-sky-700">
            {caseEntry.service.name}
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
          {caseEntry.status}
        </span>
      </div>

      {caseEntry.student ? (
        <p className="mt-3 text-xs leading-6 text-slate-500">
          {caseEntry.student.fullName}
          {caseEntry.student.grade ? ` - ${caseEntry.student.grade}` : ""}
          {caseEntry.student.classroom
            ? ` - فصل ${caseEntry.student.classroom}`
            : ""}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
        <span className="rounded-full bg-slate-100 px-2 py-1">
          {caseEntry.valuesCount} قيمة
        </span>

        <span className="rounded-full bg-slate-100 px-2 py-1">
          {caseEntry.evidencesCount} شاهد
        </span>

        <span className="rounded-full bg-slate-100 px-2 py-1">
          {formatDate(caseEntry.createdAt)}
        </span>
      </div>
    </button>
  );
}

function EmptyState() {
  return (
    <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
      <h2 className="text-xl font-black text-slate-900">
        اختر حالة لإصدار التقارير
      </h2>

      <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-500">
        عند اختيار الحالة سيقوم النظام بتجهيز بيانات التقارير تلقائيًا من
        البيانات المحفوظة مسبقًا.
      </p>
    </section>
  );
}

function CaseOverviewCard({ caseEntry }: { caseEntry: ReportCaseListItem }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-sky-700">الحالة المحددة</p>

          <h2 className="mt-2 text-2xl font-black text-slate-900">
            {caseEntry.title}
          </h2>

          <p className="mt-2 text-sm leading-7 text-slate-500">
            {caseEntry.service.name}
          </p>
        </div>

        <Link
          href={`/dashboard/cases/${caseEntry.id}`}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
        >
          عرض الحالة
        </Link>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <InfoBox label="الحالة" value={caseEntry.status} />
        <InfoBox label="تاريخ الإنشاء" value={formatDate(caseEntry.createdAt)} />
        <InfoBox label="عدد القيم" value={`${caseEntry.valuesCount}`} />
        <InfoBox label="عدد الشواهد" value={`${caseEntry.evidencesCount}`} />
      </div>

      {caseEntry.student ? (
        <div className="mt-5 rounded-3xl border border-sky-100 bg-sky-50 p-5">
          <p className="text-sm font-black text-sky-700">
            بيانات الطالب/الطالبة
          </p>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <InfoBox label="الاسم" value={caseEntry.student.fullName} />
            <InfoBox
              label="الصف"
              value={caseEntry.student.grade || "غير محدد"}
            />
            <InfoBox
              label="الفصل"
              value={caseEntry.student.classroom || "غير محدد"}
            />
            <InfoBox
              label="رقم الهوية"
              value={caseEntry.student.nationalId || "غير متوفر"}
            />
            <InfoBox
              label="ولي الأمر"
              value={caseEntry.student.guardianName || "غير متوفر"}
            />
            <InfoBox
              label="جوال ولي الأمر"
              value={caseEntry.student.guardianPhone || "غير متوفر"}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PreparedReportPreview({
  loading,
  error,
  reportData,
}: {
  loading: boolean;
  error: string;
  reportData: PreparedReportData | null;
}) {
  if (loading) {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-black text-slate-700">
          جارٍ تجهيز بيانات التقارير...
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-[2rem] border border-red-200 bg-red-50 p-6 shadow-sm">
        <h2 className="text-lg font-black text-red-800">
          تعذر تجهيز التقارير
        </h2>

        <p className="mt-2 text-sm leading-7 text-red-700">{error}</p>
      </section>
    );
  }

  if (!reportData) {
    return null;
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-emerald-700">
            بيانات التقارير جاهزة
          </p>

          <h2 className="mt-2 text-2xl font-black text-slate-900">
            {reportData.title}
          </h2>

          <p className="mt-2 text-sm leading-7 text-slate-500">
            تم تجهيز البيانات من الحالة. هذه البيانات ستكون مصدر التقارير، ولن
            يحتاج الموجه/الموجهة لإعادة إدخالها.
          </p>
        </div>

        <span className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
          جاهز
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <InfoBox label="الخدمة" value={reportData.service.name} />
        <InfoBox label="عدد القيم" value={`${reportData.values.length}`} />
        <InfoBox label="عدد الشواهد" value={`${reportData.evidences.length}`} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <ReportValuesSample values={reportData.values} />
        <ReportEvidenceSample evidences={reportData.evidences} />
      </div>
    </section>
  );
}

function ReportValuesSample({
  values,
}: {
  values: PreparedReportData["values"];
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="text-sm font-black text-slate-900">عينة من القيم</h3>

      <div className="mt-3 space-y-2">
        {values.slice(0, 6).map((item) => (
          <div
            key={`${item.fieldKey}-${item.fieldLabel}`}
            className="rounded-2xl bg-white px-4 py-3"
          >
            <p className="text-xs font-black text-slate-500">
              {item.fieldLabel}
            </p>

            <p className="mt-1 line-clamp-2 text-sm leading-7 text-slate-800">
              {item.value || "غير محدد"}
            </p>
          </div>
        ))}

        {!values.length ? (
          <p className="text-sm text-slate-500">لا توجد قيم محفوظة.</p>
        ) : null}
      </div>
    </div>
  );
}

function ReportEvidenceSample({
  evidences,
}: {
  evidences: PreparedReportData["evidences"];
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="text-sm font-black text-slate-900">عينة من الشواهد</h3>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {evidences.slice(0, 4).map((evidence) => (
          <div
            key={evidence.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
          >
            {evidence.imageUrl ? (
              <img
                src={evidence.imageUrl}
                alt={evidence.title}
                className="h-32 w-full object-cover"
              />
            ) : (
              <div className="flex h-32 items-center justify-center bg-slate-100 text-xs font-bold text-slate-500">
                ملف
              </div>
            )}

            <div className="p-3">
              <p className="line-clamp-1 text-xs font-black text-slate-800">
                {evidence.title}
              </p>
            </div>
          </div>
        ))}

        {!evidences.length ? (
          <p className="text-sm text-slate-500">لا توجد شواهد.</p>
        ) : null}
      </div>
    </div>
  );
}

function ReportCreationCard({
  selectedTemplate,
  selectedTemplateId,
  templates,
  onTemplateChange,
  reportDataReady,
  creatingReport,
  createReportError,
  onCreateReport,
}: {
  selectedTemplate: ReportTemplateChoice;
  selectedTemplateId: string;
  templates: ReportTemplateChoice[];
  onTemplateChange: (templateId: string) => void;
  reportDataReady: boolean;
  creatingReport: boolean;
  createReportError: string;
  onCreateReport: () => void;
}) {
  return (
    <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
      <h2 className="text-lg font-black text-amber-900">
        اختيار قالب التقارير
      </h2>

      <p className="mt-2 text-sm leading-7 text-amber-800">
        اختر القالب المناسب قبل إنشاء التقارير. سيتم حفظ نسخة Snapshot من القالب
        والبيانات حتى يبقى التقارير ثابتًا حتى لو تغيرت الحالة أو القالب لاحقًا.
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {templates.map((template) => {
          const active = template.id === selectedTemplateId;

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onTemplateChange(template.id)}
              className={[
                "rounded-3xl border p-4 text-right transition",
                active
                  ? "border-slate-900 bg-white shadow-sm"
                  : "border-amber-200 bg-amber-50 hover:bg-white",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <strong className="text-sm font-black text-slate-900">
                  {template.name}
                </strong>

                <span
                  className={[
                    "rounded-full px-2 py-1 text-[11px] font-black",
                    active
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-500",
                  ].join(" ")}
                >
                  {active ? "مختار" : template.badge}
                </span>
              </div>

              <p className="mt-2 text-xs leading-6 text-slate-600">
                {template.description}
              </p>

              <p className="mt-3 rounded-2xl bg-white/70 px-3 py-2 text-[11px] font-bold text-amber-800">
                الأنسب: {template.bestFor}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-amber-200 bg-white p-4">
        <p className="text-xs font-black text-slate-500">
          القالب الذي سيتم حفظه في التقارير
        </p>

        <p className="mt-1 text-sm font-black text-slate-900">
          {selectedTemplate.name}
        </p>
      </div>

      {createReportError ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {createReportError}
        </div>
      ) : null}

      <button
        type="button"
        disabled={!reportDataReady || creatingReport}
        onClick={onCreateReport}
        className="mt-5 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {creatingReport
          ? "جارٍ إنشاء التقارير..."
          : "إنشاء التقارير وفتح المعاينة"}
      </button>
    </section>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-1 line-clamp-1 text-sm font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("ar-SA");
  } catch {
    return value;
  }
}
