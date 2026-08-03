"use client";

import { useMemo, useState } from "react";
import type {
  ReportIdentitySettings,
  ReportTemplateBuilderModel,
  ReportTextSnippet,
} from "@/lib/report-engine/report-template-builder-types";
import { REPORT_SERVICE_OPTIONS } from "@/lib/report-engine/report-template-builder-types";
import { validateReportTemplateForPublishing } from "@/lib/report-engine/report-template-validation";

type ReportTemplateAdminToolsProps = {
  template: ReportTemplateBuilderModel;
  identity: ReportIdentitySettings;
  snippets: ReportTextSnippet[];
  onIdentityChange: (identity: ReportIdentitySettings) => void;
  onSnippetsChange: (snippets: ReportTextSnippet[]) => void;
};

type LibraryServiceFilter = "all" | "global" | string;

type SnippetAnalysis = {
  usedVariables: string[];
  unknownVariables: string[];
  renderedText: string;
  isEmpty: boolean;
  isLong: boolean;
};

const snippetCategories: ReportTextSnippet["category"][] = [
  "مقدمة",
  "هدف",
  "إجراء",
  "نتيجة",
  "توصية",
  "خاتمة",
];

const smartVariables: Array<{
  key: string;
  label: string;
  description: string;
  example: string;
  group: "هوية" | "حالة" | "طالب" | "خدمة" | "شواهد";
}> = [
  {
    key: "schoolName",
    label: "اسم المدرسة",
    description: "اسم المدرسة من إعدادات الهوية.",
    example: "مدرسة المستقبل المتوسطة",
    group: "هوية",
  },
  {
    key: "ministryName",
    label: "اسم الوزارة",
    description: "اسم الوزارة أو الجهة الرسمية.",
    example: "وزارة التعليم",
    group: "هوية",
  },
  {
    key: "educationDepartment",
    label: "إدارة التعليم",
    description: "إدارة التعليم المرتبطة بالمدرسة.",
    example: "إدارة تعليم الرياض",
    group: "هوية",
  },
  {
    key: "educationOffice",
    label: "مكتب التعليم",
    description: "مكتب التعليم التابع للمدرسة.",
    example: "مكتب تعليم الشمال",
    group: "هوية",
  },
  {
    key: "schoolLeaderName",
    label: "قائد/قائدة المدرسة",
    description: "اسم قائد أو قائدة المدرسة.",
    example: "أ. عبدالله محمد",
    group: "هوية",
  },
  {
    key: "counselorName",
    label: "الموجه/الموجهة الطلابية",
    description: "اسم الموجه أو الموجهة الطلابية.",
    example: "أ. أحمد علي",
    group: "هوية",
  },
  {
    key: "academicYear",
    label: "العام الدراسي",
    description: "العام الدراسي الحالي.",
    example: "1447هـ",
    group: "هوية",
  },
  {
    key: "semester",
    label: "الفصل الدراسي",
    description: "الفصل الدراسي الحالي.",
    example: "الفصل الدراسي الأول",
    group: "هوية",
  },
  {
    key: "serviceName",
    label: "اسم الخدمة",
    description: "اسم الخدمة التي صدر منها التقارير.",
    example: "برامج التوجيه الطلابي",
    group: "خدمة",
  },
  {
    key: "reportTitle",
    label: "عنوان التقارير",
    description: "عنوان التقارير النهائي.",
    example: "تقرير برنامج تعزيز السلوك الإيجابي",
    group: "حالة",
  },
  {
    key: "caseTitle",
    label: "عنوان الحالة",
    description: "عنوان الحالة المرتبطة بالتقارير.",
    example: "برنامج تعزيز السلوك الإيجابي",
    group: "حالة",
  },
  {
    key: "programTitle",
    label: "عنوان البرنامج",
    description: "اسم البرنامج أو النشاط من بيانات الحالة.",
    example: "برنامج تعزيز السلوك الإيجابي",
    group: "خدمة",
  },
  {
    key: "executionDate",
    label: "تاريخ التنفيذ",
    description: "تاريخ تنفيذ البرنامج أو الإجراء.",
    example: "2026-05-26",
    group: "حالة",
  },
  {
    key: "dayText",
    label: "اليوم",
    description: "اليوم بصيغة جاهزة داخل الجملة.",
    example: "، الموافق يوم الأحد",
    group: "حالة",
  },
  {
    key: "targetGroup",
    label: "الفئة المستهدفة",
    description: "الفئة المستهدفة من البرنامج أو التقارير.",
    example: "طلاب الصفوف الأولية",
    group: "طالب",
  },
  {
    key: "studentName",
    label: "اسم الطالب/الطالبة",
    description: "اسم الطالب أو الطالبة المرتبط بالحالة.",
    example: "محمد علي",
    group: "طالب",
  },
  {
    key: "studentGrade",
    label: "الصف",
    description: "صف الطالب أو الطالبة.",
    example: "الأول متوسط",
    group: "طالب",
  },
  {
    key: "studentClassroom",
    label: "الفصل",
    description: "الفصل الدراسي للطالب أو الطالبة.",
    example: "1 / أ",
    group: "طالب",
  },
  {
    key: "guardianName",
    label: "ولي الأمر",
    description: "اسم ولي الأمر عند توفره.",
    example: "عبدالله علي",
    group: "طالب",
  },
  {
    key: "executionAction",
    label: "الإجراء التنفيذي",
    description: "الإجراء الذي تم تنفيذه داخل الخدمة.",
    example: "حملة تعريفية بالسلوك الإيجابي",
    group: "خدمة",
  },
  {
    key: "executionMechanism",
    label: "آلية التنفيذ",
    description: "طريقة تنفيذ الإجراء.",
    example: "إذاعة مدرسية ولوحات إرشادية ونقاشات صفية",
    group: "خدمة",
  },
  {
    key: "performanceIndicator",
    label: "مؤشر الأداء",
    description: "المؤشر المستخدم لقياس أثر التنفيذ.",
    example: "تحسن مستوى الالتزام بالسلوك الإيجابي",
    group: "خدمة",
  },
  {
    key: "evidenceSuggestion",
    label: "الشواهد المقترحة",
    description: "الشواهد المناسبة لهذا النوع من التقارير.",
    example: "صور البرنامج، كشف الحضور، نموذج التقييم",
    group: "شواهد",
  },
  {
    key: "evidenceCountText",
    label: "عدد الشواهد",
    description: "عدد الشواهد بصياغة عربية مناسبة.",
    example: "4 شواهد",
    group: "شواهد",
  },
];

const knownVariableKeys = new Set(smartVariables.map((variable) => variable.key));

export function ReportTemplateAdminTools({
  template,
  identity,
  snippets,
  onIdentityChange,
  onSnippetsChange,
}: ReportTemplateAdminToolsProps) {
  const [activePanel, setActivePanel] = useState<
    "identity" | "library" | "test"
  >("identity");

  const [libraryServiceFilter, setLibraryServiceFilter] =
    useState<LibraryServiceFilter>("all");

  const [librarySearchQuery, setLibrarySearchQuery] = useState("");

  const [copiedVariableKey, setCopiedVariableKey] = useState("");

  const validation = useMemo(() => {
    return validateReportTemplateForPublishing({
      template,
      identity,
      snippets,
    });
  }, [template, identity, snippets]);

  const sampleVariables = useMemo(() => {
    return buildSampleVariables(identity, template);
  }, [identity, template]);

  const filteredSnippets = useMemo(() => {
    const keyword = librarySearchQuery.trim().toLowerCase();

    return snippets.filter((snippet) => {
      const matchesService =
        libraryServiceFilter === "all"
          ? true
          : libraryServiceFilter === "global"
            ? !snippet.serviceSlug
            : snippet.serviceSlug === libraryServiceFilter;

      if (!matchesService) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return [
        snippet.title,
        snippet.category,
        snippet.serviceSlug || "عام",
        snippet.content,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [snippets, librarySearchQuery, libraryServiceFilter]);

  const groupedSnippets = useMemo(() => {
    return groupSnippetsByService(filteredSnippets);
  }, [filteredSnippets]);

  const libraryStats = useMemo(() => {
    const analyses = snippets.map((snippet) =>
      analyzeSnippet(snippet, sampleVariables)
    );

    const unknownVariablesCount = analyses.reduce(
      (total, analysis) => total + analysis.unknownVariables.length,
      0
    );

    const emptyCount = analyses.filter((analysis) => analysis.isEmpty).length;
    const longCount = analyses.filter((analysis) => analysis.isLong).length;

    return {
      total: snippets.length,
      unknownVariablesCount,
      emptyCount,
      longCount,
    };
  }, [snippets, sampleVariables]);

  function updateIdentity<K extends keyof ReportIdentitySettings>(
    key: K,
    value: ReportIdentitySettings[K]
  ) {
    onIdentityChange({
      ...identity,
      [key]: value,
    });
  }

  function addSnippet(serviceSlug?: string) {
    const newSnippet: ReportTextSnippet = {
      id: `snippet-${Date.now()}`,
      title: "نص جديد",
      category: "مقدمة",
      serviceSlug:
        serviceSlug ||
        (template.scope === "SERVICE" ? template.serviceSlug : undefined),
      content:
        'تم إعداد هذا النص لاستخدامه داخل تقرير "{reportTitle}" ضمن خدمة {serviceName}.',
    };

    onSnippetsChange([newSnippet, ...snippets]);
  }

  function updateSnippet(
    snippetId: string,
    updater: (snippet: ReportTextSnippet) => ReportTextSnippet
  ) {
    onSnippetsChange(
      snippets.map((snippet) =>
        snippet.id === snippetId ? updater(snippet) : snippet
      )
    );
  }

  function deleteSnippet(snippetId: string) {
    onSnippetsChange(snippets.filter((snippet) => snippet.id !== snippetId));
  }

  async function copyVariable(key: string) {
    const value = `{${key}}`;

    try {
      await navigator.clipboard.writeText(value);
      setCopiedVariableKey(key);
      window.setTimeout(() => setCopiedVariableKey(""), 1200);
    } catch {
      setCopiedVariableKey("");
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            أدوات تجهيز القالب
          </h2>

          <p className="mt-1 text-sm leading-7 text-slate-500">
            إعداد الهوية، مكتبة النصوص، واختبار جاهزية القالب قبل النشر.
          </p>
        </div>

        <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
          <PanelButton
            label="الهوية"
            active={activePanel === "identity"}
            onClick={() => setActivePanel("identity")}
          />

          <PanelButton
            label="مكتبة النصوص"
            active={activePanel === "library"}
            onClick={() => setActivePanel("library")}
          />

          <PanelButton
            label="اختبار القالب"
            active={activePanel === "test"}
            onClick={() => setActivePanel("test")}
          />
        </div>
      </div>

      {activePanel === "identity" ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field
            label="اسم الوزارة"
            value={identity.ministryName}
            onChange={(value) => updateIdentity("ministryName", value)}
          />

          <Field
            label="إدارة التعليم"
            value={identity.educationDepartment}
            onChange={(value) => updateIdentity("educationDepartment", value)}
          />

          <Field
            label="مكتب التعليم"
            value={identity.educationOffice}
            onChange={(value) => updateIdentity("educationOffice", value)}
          />

          <Field
            label="اسم المدرسة"
            value={identity.schoolName}
            onChange={(value) => updateIdentity("schoolName", value)}
          />

          <Field
            label="قائد/قائدة المدرسة"
            value={identity.schoolLeaderName}
            onChange={(value) => updateIdentity("schoolLeaderName", value)}
          />

          <Field
            label="الموجه/الموجهة الطلابية"
            value={identity.counselorName}
            onChange={(value) => updateIdentity("counselorName", value)}
          />

          <Field
            label="العام الدراسي"
            value={identity.academicYear}
            onChange={(value) => updateIdentity("academicYear", value)}
          />

          <Field
            label="الفصل الدراسي"
            value={identity.semester}
            onChange={(value) => updateIdentity("semester", value)}
          />

          <Field
            label="رابط شعار الوزارة"
            value={identity.ministryLogoUrl}
            onChange={(value) => updateIdentity("ministryLogoUrl", value)}
          />

          <Field
            label="رابط شعار المدرسة"
            value={identity.schoolLogoUrl}
            onChange={(value) => updateIdentity("schoolLogoUrl", value)}
          />

          <Field
            label="اللون الأساسي"
            value={identity.primaryColor}
            onChange={(value) => updateIdentity("primaryColor", value)}
          />

          <Field
            label="اللون الثانوي"
            value={identity.secondaryColor}
            onChange={(value) => updateIdentity("secondaryColor", value)}
          />

          <div>
            <label className="text-xs font-black text-slate-500">الخط</label>

            <select
              value={identity.fontFamily}
              onChange={(event) =>
                updateIdentity(
                  "fontFamily",
                  event.target.value as ReportIdentitySettings["fontFamily"]
                )
              }
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-emerald-700"
            >
              <option value="Tajawal">Tajawal</option>
              <option value="Cairo">Cairo</option>
              <option value="Arial">Arial</option>
            </select>
          </div>
        </div>
      ) : null}

      {activePanel === "library" ? (
        <div className="mt-5 space-y-5">
          <LibraryHeader
            stats={libraryStats}
            onAddGlobalSnippet={() => addSnippet(undefined)}
          />

          <LibraryControls
            serviceFilter={libraryServiceFilter}
            searchQuery={librarySearchQuery}
            onServiceFilterChange={setLibraryServiceFilter}
            onSearchQueryChange={setLibrarySearchQuery}
          />

          <SmartVariablesPanel
            copiedVariableKey={copiedVariableKey}
            onCopyVariable={copyVariable}
          />

          <div className="grid gap-4">
            {groupedSnippets.length ? (
              groupedSnippets.map((group) => (
                <SnippetServiceGroup
                  key={group.serviceKey}
                  serviceKey={group.serviceKey}
                  serviceName={group.serviceName}
                  snippets={group.snippets}
                  sampleVariables={sampleVariables}
                  onAddSnippet={() =>
                    addSnippet(
                      group.serviceKey === "global"
                        ? undefined
                        : group.serviceKey
                    )
                  }
                  onUpdateSnippet={updateSnippet}
                  onDeleteSnippet={deleteSnippet}
                />
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <h3 className="text-sm font-black text-slate-900">
                  لا توجد نصوص مطابقة
                </h3>

                <p className="mt-2 text-sm leading-7 text-slate-500">
                  جرّب تغيير فلتر الخدمة أو البحث، أو أضف نصًا جديدًا لهذه
                  المكتبة.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    addSnippet(
                      libraryServiceFilter === "all" ||
                        libraryServiceFilter === "global"
                        ? undefined
                        : libraryServiceFilter
                    )
                  }
                  className="mt-4 rounded-2xl bg-emerald-800 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-900"
                >
                  إضافة نص جديد
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {activePanel === "test" ? (
        <div className="mt-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  نتيجة اختبار القالب
                </h3>

                <p className="mt-1 text-xs leading-6 text-slate-500">
                  هذا الاختبار يساعدك تعرف هل القالب جاهز للنشر أو يحتاج تعديل.
                </p>
              </div>

              <div
                className={[
                  "rounded-2xl px-4 py-3 text-sm font-black",
                  validation.canPublish
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-red-100 text-red-800",
                ].join(" ")}
              >
                {validation.score}/100
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {validation.issues.map((issue) => (
                <div
                  key={issue.id}
                  className={[
                    "rounded-2xl border p-4",
                    issue.severity === "success"
                      ? "border-emerald-200 bg-emerald-50"
                      : issue.severity === "error"
                        ? "border-red-200 bg-red-50"
                        : "border-amber-200 bg-amber-50",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong
                      className={[
                        "text-sm",
                        issue.severity === "success"
                          ? "text-emerald-900"
                          : issue.severity === "error"
                            ? "text-red-900"
                            : "text-amber-900",
                      ].join(" ")}
                    >
                      {issue.title}
                    </strong>

                    <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-black text-slate-600">
                      {issue.severity === "success"
                        ? "جاهز"
                        : issue.severity === "error"
                          ? "خطأ"
                          : "تنبيه"}
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    {issue.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-7 text-slate-500">
              حالة النشر المقترحة:{" "}
              <span
                className={
                  validation.canPublish
                    ? "font-black text-emerald-700"
                    : "font-black text-red-700"
                }
              >
                {validation.canPublish
                  ? "يمكن نشر القالب"
                  : "لا تنشر القالب قبل إصلاح الأخطاء"}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function LibraryHeader({
  stats,
  onAddGlobalSnippet,
}: {
  stats: {
    total: number;
    unknownVariablesCount: number;
    emptyCount: number;
    longCount: number;
  };
  onAddGlobalSnippet: () => void;
}) {
  return (
    <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-900">
            مكتبة النصوص الذكية
          </h3>

          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
            رتّب النصوص حسب الخدمة، واستخدم المتغيرات الذكية لبناء نصوص رسمية
            تظهر لاحقًا داخل التقارير بدون أن يعيد الموجه كتابة كل شيء من
            الصفر.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddGlobalSnippet}
          className="rounded-2xl bg-emerald-800 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-900"
        >
          إضافة نص عام
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <MetricBox label="النصوص" value={`${stats.total}`} />
        <MetricBox
          label="متغيرات خاطئة"
          value={`${stats.unknownVariablesCount}`}
          danger={stats.unknownVariablesCount > 0}
        />
        <MetricBox
          label="نصوص فارغة"
          value={`${stats.emptyCount}`}
          danger={stats.emptyCount > 0}
        />
        <MetricBox
          label="نصوص طويلة"
          value={`${stats.longCount}`}
          warning={stats.longCount > 0}
        />
      </div>
    </div>
  );
}

function LibraryControls({
  serviceFilter,
  searchQuery,
  onServiceFilterChange,
  onSearchQueryChange,
}: {
  serviceFilter: LibraryServiceFilter;
  searchQuery: string;
  onServiceFilterChange: (value: LibraryServiceFilter) => void;
  onSearchQueryChange: (value: string) => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-3 lg:grid-cols-[260px_1fr]">
        <div>
          <label className="text-xs font-black text-slate-500">
            فلترة حسب الخدمة
          </label>

          <select
            value={serviceFilter}
            onChange={(event) => onServiceFilterChange(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-emerald-700"
          >
            <option value="all">كل النصوص</option>
            <option value="global">نصوص عامة لكل الخدمات</option>
            {REPORT_SERVICE_OPTIONS.map((service) => (
              <option key={service.slug} value={service.slug}>
                {service.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-black text-slate-500">
            بحث داخل المكتبة
          </label>

          <input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="ابحث بعنوان النص أو التصنيف أو المحتوى..."
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-emerald-700"
          />
        </div>
      </div>
    </div>
  );
}

function SmartVariablesPanel({
  copiedVariableKey,
  onCopyVariable,
}: {
  copiedVariableKey: string;
  onCopyVariable: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const groupedVariables = groupVariablesByGroup(smartVariables);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 text-right"
      >
        <div>
          <h3 className="text-sm font-black text-slate-900">
            المتغيرات الذكية المتاحة
          </h3>

          <p className="mt-1 text-xs leading-6 text-slate-500">
            انسخ المتغير والصقه داخل أي نص. النظام يفحص المتغيرات الخاطئة
            تلقائيًا.
          </p>
        </div>

        <span className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">
          {open ? "إخفاء" : "عرض"}
        </span>
      </button>

      {open ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {groupedVariables.map((group) => (
            <div
              key={group.group}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <h4 className="text-xs font-black text-slate-500">
                {group.group}
              </h4>

              <div className="mt-3 space-y-2">
                {group.variables.map((variable) => (
                  <div
                    key={variable.key}
                    className="rounded-2xl border border-slate-200 bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black text-slate-900">
                          {variable.label}
                        </p>

                        <code className="mt-1 inline-flex rounded-xl bg-sky-50 px-2 py-1 text-[11px] font-black text-sky-700">
                          {"{"}
                          {variable.key}
                          {"}"}
                        </code>
                      </div>

                      <button
                        type="button"
                        onClick={() => onCopyVariable(variable.key)}
                        className="rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-black text-white transition hover:bg-slate-800"
                      >
                        {copiedVariableKey === variable.key
                          ? "تم النسخ"
                          : "نسخ"}
                      </button>
                    </div>

                    <p className="mt-2 text-[11px] leading-5 text-slate-500">
                      {variable.description}
                    </p>

                    <p className="mt-2 rounded-xl bg-slate-50 px-2 py-1 text-[11px] leading-5 text-slate-500">
                      مثال: {variable.example}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SnippetServiceGroup({
  serviceKey,
  serviceName,
  snippets,
  sampleVariables,
  onAddSnippet,
  onUpdateSnippet,
  onDeleteSnippet,
}: {
  serviceKey: string;
  serviceName: string;
  snippets: ReportTextSnippet[];
  sampleVariables: Record<string, string>;
  onAddSnippet: () => void;
  onUpdateSnippet: (
    snippetId: string,
    updater: (snippet: ReportTextSnippet) => ReportTextSnippet
  ) => void;
  onDeleteSnippet: (snippetId: string) => void;
}) {
  const analyses = snippets.map((snippet) =>
    analyzeSnippet(snippet, sampleVariables)
  );

  const errorsCount = analyses.reduce(
    (total, analysis) => total + analysis.unknownVariables.length,
    0
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-black text-slate-900">
              {serviceName}
            </h3>

            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">
              {snippets.length} نص
            </span>

            {errorsCount > 0 ? (
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-black text-red-700">
                {errorsCount} متغير خاطئ
              </span>
            ) : (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                جاهز
              </span>
            )}
          </div>

          <p className="mt-1 text-xs leading-6 text-slate-500">
            {serviceKey === "global"
              ? "نصوص عامة يمكن استخدامها مع جميع الخدمات."
              : "نصوص مخصصة لهذه الخدمة وتساعد على توحيد صياغة تقاريرها."}
          </p>
        </div>

        <button
          type="button"
          onClick={onAddSnippet}
          className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-800 transition hover:bg-emerald-100"
        >
          إضافة نص لهذه الخدمة
        </button>
      </div>

      <div className="mt-4 grid gap-4">
        {snippets.map((snippet) => (
          <SnippetEditorCard
            key={snippet.id}
            snippet={snippet}
            sampleVariables={sampleVariables}
            onUpdate={(updater) => onUpdateSnippet(snippet.id, updater)}
            onDelete={() => onDeleteSnippet(snippet.id)}
          />
        ))}
      </div>
    </section>
  );
}

function SnippetEditorCard({
  snippet,
  sampleVariables,
  onUpdate,
  onDelete,
}: {
  snippet: ReportTextSnippet;
  sampleVariables: Record<string, string>;
  onUpdate: (updater: (snippet: ReportTextSnippet) => ReportTextSnippet) => void;
  onDelete: () => void;
}) {
  const analysis = analyzeSnippet(snippet, sampleVariables);

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-3 xl:grid-cols-[1fr_150px_190px_auto]">
        <input
          value={snippet.title}
          onChange={(event) =>
            onUpdate((current) => ({
              ...current,
              title: event.target.value,
            }))
          }
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-emerald-700"
          placeholder="عنوان النص"
        />

        <select
          value={snippet.category}
          onChange={(event) =>
            onUpdate((current) => ({
              ...current,
              category: event.target.value as ReportTextSnippet["category"],
            }))
          }
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-emerald-700"
        >
          {snippetCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <select
          value={snippet.serviceSlug || ""}
          onChange={(event) =>
            onUpdate((current) => ({
              ...current,
              serviceSlug: event.target.value || undefined,
            }))
          }
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-emerald-700"
        >
          <option value="">عام لكل الخدمات</option>
          {REPORT_SERVICE_OPTIONS.map((service) => (
            <option key={service.slug} value={service.slug}>
              {service.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onDelete}
          className="rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50"
        >
          حذف
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {analysis.isEmpty ? (
          <StatusPill tone="red">النص فارغ</StatusPill>
        ) : null}

        {analysis.isLong ? (
          <StatusPill tone="amber">النص طويل وقد يؤثر على A4</StatusPill>
        ) : null}

        {analysis.unknownVariables.length ? (
          <StatusPill tone="red">
            {analysis.unknownVariables.length} متغير غير معروف
          </StatusPill>
        ) : (
          <StatusPill tone="emerald">المتغيرات سليمة</StatusPill>
        )}

        <StatusPill tone="slate">
          {analysis.usedVariables.length} متغير مستخدم
        </StatusPill>
      </div>

      <textarea
        value={snippet.content}
        onChange={(event) =>
          onUpdate((current) => ({
            ...current,
            content: event.target.value,
          }))
        }
        rows={4}
        className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-700 outline-none focus:border-emerald-700"
        placeholder="اكتب النص هنا ويمكنك استخدام متغيرات مثل {programTitle} و {executionDate}"
      />

      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-black text-slate-500">
            المتغيرات المستخدمة
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {analysis.usedVariables.length ? (
              analysis.usedVariables.map((variable) => (
                <span
                  key={variable}
                  className={[
                    "rounded-2xl px-3 py-2 text-xs font-black",
                    knownVariableKeys.has(variable)
                      ? "bg-sky-50 text-sky-700"
                      : "bg-red-50 text-red-700",
                  ].join(" ")}
                >
                  {"{"}
                  {variable}
                  {"}"}
                </span>
              ))
            ) : (
              <span className="text-xs leading-6 text-slate-500">
                لا توجد متغيرات في هذا النص.
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs font-black text-emerald-700">
            المعاينة بعد استبدال المتغيرات
          </p>

          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-800">
            {analysis.renderedText || "لا توجد معاينة للنص."}
          </p>
        </div>
      </div>
    </div>
  );
}

function PanelButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl px-4 py-2 text-xs font-black transition",
        active
          ? "bg-white text-emerald-800 shadow-sm"
          : "text-slate-500 hover:text-slate-900",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-black text-slate-500">{label}</label>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-700"
      />
    </div>
  );
}

function MetricBox({
  label,
  value,
  danger,
  warning,
}: {
  label: string;
  value: string;
  danger?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border bg-white px-4 py-3",
        danger
          ? "border-red-200"
          : warning
            ? "border-amber-200"
            : "border-emerald-100",
      ].join(" ")}
    >
      <p className="text-xs font-black text-slate-500">{label}</p>

      <p
        className={[
          "mt-1 text-xl font-black",
          danger
            ? "text-red-700"
            : warning
              ? "text-amber-700"
              : "text-slate-900",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function StatusPill({
  tone,
  children,
}: {
  tone: "slate" | "sky" | "emerald" | "amber" | "red";
  children: React.ReactNode;
}) {
  const classes = {
    slate: "bg-slate-100 text-slate-700",
    sky: "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-[11px] font-black ${classes[tone]}`}
    >
      {children}
    </span>
  );
}

function groupSnippetsByService(snippets: ReportTextSnippet[]) {
  const groups = new Map<
    string,
    {
      serviceKey: string;
      serviceName: string;
      snippets: ReportTextSnippet[];
    }
  >();

  for (const snippet of snippets) {
    const serviceKey = snippet.serviceSlug || "global";
    const serviceName = getServiceName(serviceKey);

    if (!groups.has(serviceKey)) {
      groups.set(serviceKey, {
        serviceKey,
        serviceName,
        snippets: [],
      });
    }

    groups.get(serviceKey)?.snippets.push(snippet);
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.serviceKey === "global") return -1;
    if (b.serviceKey === "global") return 1;
    return a.serviceName.localeCompare(b.serviceName, "ar");
  });
}

function groupVariablesByGroup(variables: typeof smartVariables) {
  const groups = new Map<
    string,
    {
      group: string;
      variables: typeof smartVariables;
    }
  >();

  for (const variable of variables) {
    if (!groups.has(variable.group)) {
      groups.set(variable.group, {
        group: variable.group,
        variables: [],
      });
    }

    groups.get(variable.group)?.variables.push(variable);
  }

  return Array.from(groups.values());
}

function analyzeSnippet(
  snippet: ReportTextSnippet,
  sampleVariables: Record<string, string>
): SnippetAnalysis {
  const usedVariables = extractVariablesFromText(snippet.content);
  const unknownVariables = usedVariables.filter(
    (variable) => !knownVariableKeys.has(variable)
  );

  return {
    usedVariables,
    unknownVariables,
    renderedText: renderTextWithVariables(snippet.content, sampleVariables),
    isEmpty: snippet.content.trim().length === 0,
    isLong: snippet.content.trim().length > 900,
  };
}

function extractVariablesFromText(text: string) {
  const matches = text.match(/\{([^}]+)\}/g) || [];

  return Array.from(
    new Set(matches.map((match) => match.replace(/[{}]/g, "").trim()))
  ).filter(Boolean);
}

function renderTextWithVariables(
  text: string,
  variables: Record<string, string>
) {
  return text.replace(/\{([^}]+)\}/g, (_, variableName: string) => {
    const cleanVariableName = String(variableName || "").trim();

    if (!knownVariableKeys.has(cleanVariableName)) {
      return `{${cleanVariableName}}`;
    }

    return variables[cleanVariableName] || "";
  });
}

function buildSampleVariables(
  identity: ReportIdentitySettings,
  template: ReportTemplateBuilderModel
) {
  const serviceName =
    template.scope === "SERVICE" && template.serviceSlug
      ? getServiceName(template.serviceSlug)
      : "برامج التوجيه الطلابي";

  return {
    schoolName: identity.schoolName || "اسم المدرسة",
    ministryName: identity.ministryName || "وزارة التعليم",
    educationDepartment: identity.educationDepartment || "إدارة التعليم",
    educationOffice: identity.educationOffice || "مكتب التعليم",
    schoolLeaderName: identity.schoolLeaderName || "قائد/قائدة المدرسة",
    counselorName: identity.counselorName || "الموجه/الموجهة الطلابية",
    academicYear: identity.academicYear || "العام الدراسي",
    semester: identity.semester || "الفصل الدراسي",
    serviceName,
    reportTitle: template.name || "عنوان التقارير",
    caseTitle: "حالة إرشادية تجريبية",
    programTitle: "برنامج تعزيز السلوك الإيجابي",
    executionDate: "2026-05-26",
    dayText: "، الموافق يوم الأحد",
    targetGroup: "طلاب الصفوف الأولية",
    studentName: "محمد علي",
    studentGrade: "الأول متوسط",
    studentClassroom: "1 / أ",
    guardianName: "عبدالله علي",
    executionAction: "حملة تعريفية بالسلوك الإيجابي",
    executionMechanism: "إذاعة مدرسية ولوحات إرشادية ونقاشات صفية",
    performanceIndicator: "تحسن مستوى الالتزام بالسلوك الإيجابي",
    evidenceSuggestion: "صور البرنامج، كشف الحضور، نموذج التقييم",
    evidenceCountText: "4 شواهد",
  };
}

function getServiceName(serviceSlug: string) {
  if (serviceSlug === "global") {
    return "نصوص عامة لكل الخدمات";
  }

  return (
    REPORT_SERVICE_OPTIONS.find((service) => service.slug === serviceSlug)
      ?.name || serviceSlug
  );
}