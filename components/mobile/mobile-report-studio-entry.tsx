"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { MobileAppShell } from "@/components/mobile/mobile-app-shell";
import { MobileIcon } from "@/components/mobile/mobile-icons";
import { MobilePopCard } from "@/components/mobile/mobile-pop-card";
import type { MobileReportTemplateOption } from "@/components/mobile/mobile-report-prepare-flow";
import { MobileReportReadablePreview } from "@/components/mobile/mobile-report-readable-preview";
import { MobileReportStudioFieldEditor } from "@/components/mobile/mobile-report-studio-field-editor";
import { getReportVariantById } from "@/lib/report-engine/report-variant-registry";
import type { SmartReportPayload } from "@/lib/report-engine/smart-report-types";
import {
  buildReportFlowPrepareFields,
  createReportFlowPreparation,
} from "@/lib/report-flow/report-flow-payload";
import {
  loadReportFlowPreparation,
  saveReportFlowPreparation,
} from "@/lib/report-flow/report-flow-storage";
import type {
  ReportFlowExecutionSummarySource,
  ReportFlowPreparation,
  ReportFlowPrepareField,
} from "@/lib/report-flow/report-flow-types";

type MobileReportStudioEntryProps = {
  caseId: string;
  payload: SmartReportPayload;
  selectedVariantId: string;
  templates: MobileReportTemplateOption[];
  selectedTemplateId?: string;
  approvedSnapshot?: {
    id: string;
    previewUrl: string;
  } | null;
};

type ChecklistItem = {
  id: string;
  title: string;
  description: string;
  status: "ready" | "pending";
};

type StudioTab = "fields" | "summary" | "evidence" | "preview";

type FeedbackState = {
  open: boolean;
  title: string;
  description?: string;
  variant: "info" | "success" | "warning" | "error";
};

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function countWords(value: string) {
  return cleanText(value).split(/\s+/).filter(Boolean).length;
}

function limitWords(value: string, maxWords = 80) {
  return cleanText(value)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxWords)
    .join(" ");
}

function formatDate(value?: string | null) {
  if (!value) return "غير محدد";

  try {
    return new Date(value).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "غير محدد";
  }
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.6rem] bg-white/85 p-4 shadow-sm ring-1 ring-white/90">
      <div className="mb-3">
        <h2 className="text-base font-black text-slate-950">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function MobileReportStudioEntry({
  caseId,
  payload,
  selectedVariantId,
  templates,
  selectedTemplateId = "",
  approvedSnapshot = null,
}: MobileReportStudioEntryProps) {
  const editorRef = useRef<HTMLElement | null>(null);
  const selectedVariant = getReportVariantById(selectedVariantId);
  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ||
    templates[0] ||
    null;

  const [activeTab, setActiveTab] = useState<StudioTab>("fields");
  const [search, setSearch] = useState("");
  const [fields, setFields] = useState<ReportFlowPrepareField[]>([]);
  const [executionSummary, setExecutionSummary] = useState("");
  const [summarySource, setSummarySource] =
    useState<ReportFlowExecutionSummarySource>("FALLBACK");
  const [feedback, setFeedback] = useState<FeedbackState>({
    open: false,
    title: "",
    description: "",
    variant: "info",
  });

  useEffect(() => {
    const loaded = loadReportFlowPreparation(caseId, selectedVariant.id);

    if (loaded) {
      setFields(loaded.fields);
      setExecutionSummary(cleanText(loaded.executionSummary));
      setSummarySource(loaded.executionSummarySource || "FALLBACK");
      return;
    }

    setFields(buildReportFlowPrepareFields(payload));
    setExecutionSummary(cleanText(payload.narrative.body));
    setSummarySource("FALLBACK");
  }, [caseId, payload, selectedVariant.id]);

  const selectedFieldsCount = fields.filter((field) => field.selected).length;
  const summaryWords = countWords(executionSummary);
  const evidenceItems = Array.isArray(payload.evidence.items)
    ? payload.evidence.items
    : [];
  const evidenceCount = evidenceItems.length;

  const previewPreparation =
    selectedFieldsCount > 0
      ? buildPreparation()
      : null;

  const a4Href = useMemo(() => {
    const params = new URLSearchParams();
    params.set("variant", selectedVariant.id);

    if (selectedTemplate?.id) {
      params.set("templateId", selectedTemplate.id);
    }

    return `/mobile/counselor/report-2/cases/${encodeURIComponent(caseId)}/a4-preview?${params.toString()}`;
  }, [caseId, selectedTemplate?.id, selectedVariant.id]);

  const readyHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set("variant", selectedVariant.id);

    if (selectedTemplate?.id) {
      params.set("templateId", selectedTemplate.id);
    }

    return `/mobile/counselor/report-2/cases/${encodeURIComponent(caseId)}/ready?${params.toString()}`;
  }, [caseId, selectedTemplate?.id, selectedVariant.id]);

  const fullStudioHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set("variant", selectedVariant.id);

    if (selectedTemplate?.id) {
      params.set("templateId", selectedTemplate.id);
    }

    return `/dashboard/report-2/cases/${encodeURIComponent(caseId)}/studio?${params.toString()}`;
  }, [caseId, selectedTemplate?.id, selectedVariant.id]);

  const checklist = useMemo<ChecklistItem[]>(
    () => [
      {
        id: "fields",
        title: "الحقول المختارة",
        description:
          selectedFieldsCount > 0
            ? `${selectedFieldsCount} حقل جاهز للعرض في التقرير`
            : "لم يتم اختيار أي حقل للعرض حتى الآن",
        status: selectedFieldsCount > 0 ? "ready" : "pending",
      },
      {
        id: "summary",
        title: "وصف التنفيذ",
        description:
          summaryWords > 0
            ? `${summaryWords} كلمة محفوظة في وصف التنفيذ`
            : "أضف وصف التنفيذ من التبويب المخصص",
        status: summaryWords > 0 ? "ready" : "pending",
      },
      {
        id: "evidence",
        title: "الشواهد",
        description:
          evidenceCount > 0
            ? `${evidenceCount} شاهد متاح في الحالة`
            : "لا توجد شواهد مرتبطة بالحالة حتى الآن",
        status: evidenceCount > 0 ? "ready" : "pending",
      },
      {
        id: "preview",
        title: "المراجعة",
        description:
          selectedFieldsCount > 0 && summaryWords > 0
            ? "نسخة القراءة المحمولة جاهزة للمراجعة"
            : "أكمل الحقول ووصف التنفيذ أولًا",
        status:
          selectedFieldsCount > 0 && summaryWords > 0 ? "ready" : "pending",
      },
      {
        id: "approval",
        title: "الاعتماد",
        description: approvedSnapshot
          ? "يوجد تقرير معتمد لهذه الحالة"
          : "خطوة الاعتماد تأتي لاحقًا من المسار المحمول",
        status: approvedSnapshot ? "ready" : "pending",
      },
    ],
    [approvedSnapshot, evidenceCount, selectedFieldsCount, summaryWords],
  );

  function openFeedback(
    variant: FeedbackState["variant"],
    title: string,
    description?: string,
  ) {
    setFeedback({
      open: true,
      title,
      description,
      variant,
    });
  }

  function updateField(
    fieldId: string,
    patch: Partial<Pick<ReportFlowPrepareField, "label" | "value" | "selected">>,
  ) {
    setFields((current) =>
      current.map((field) =>
        field.id === fieldId
          ? {
              ...field,
              ...patch,
            }
          : field,
      ),
    );
  }

  function buildPreparation(): ReportFlowPreparation {
    return createReportFlowPreparation({
      payload,
      variantId: selectedVariant.id,
      fields,
      executionSummary:
        cleanText(executionSummary) || cleanText(payload.narrative.body),
      executionSummarySource: summarySource,
      languageMode: payload.languageMode,
    });
  }

  function startEditing() {
    setActiveTab("fields");
    requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function persistPreparation(options?: {
    showFeedback?: boolean;
    successTitle?: string;
    successDescription?: string;
  }) {
    const {
      showFeedback = true,
      successTitle = "تم حفظ التعديلات",
      successDescription =
        "تم تحديث تحضير التقرير في نفس التخزين المستخدم لمسار لوحة التحكم.",
    } = options || {};

    if (!selectedFieldsCount) {
      openFeedback(
        "warning",
        "لا توجد حقول مختارة",
        "اختر حقلًا واحدًا على الأقل قبل حفظ تعديلات التقرير.",
      );
      return null;
    }

    const safeSummary =
      cleanText(executionSummary) || cleanText(payload.narrative.body);

    if (!safeSummary) {
      openFeedback(
        "warning",
        "وصف التنفيذ فارغ",
        "أضف وصف التنفيذ قبل حفظ التعديلات.",
      );
      return null;
    }

    const preparation = buildPreparation();
    saveReportFlowPreparation(preparation);
    setExecutionSummary(preparation.executionSummary);

    if (showFeedback) {
      openFeedback("success", successTitle, successDescription);
    }

    return preparation;
  }

  function saveChanges() {
    persistPreparation();
  }

  function openPreviewTab() {
    const preparation = persistPreparation({
      showFeedback: false,
    });

    if (!preparation) {
      return;
    }

    setActiveTab("preview");
    requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    openFeedback(
      "success",
      "تم تجهيز المراجعة",
      "تم حفظ التعديلات الحالية والانتقال إلى نسخة القراءة المحمولة.",
    );
  }

  const tabs: Array<{
    id: StudioTab;
    label: string;
    icon: "file" | "spark" | "camera" | "shield";
  }> = [
    { id: "fields", label: "الحقول", icon: "file" },
    { id: "summary", label: "وصف التنفيذ", icon: "spark" },
    { id: "evidence", label: "الشواهد", icon: "camera" },
    { id: "preview", label: "المراجعة", icon: "shield" },
  ];

  return (
    <MobileAppShell activeSection="reports">
      <div className="space-y-4 pb-24" dir="rtl">
        <section className="mobile-hero-card-dark relative overflow-hidden rounded-[1.8rem] p-4">
          <div className="absolute -left-12 -top-12 h-32 w-32 rounded-full bg-sky-200/70 blur-2xl" />
          <div className="absolute -bottom-16 right-10 h-36 w-36 rounded-full bg-cyan-100/80 blur-2xl" />

          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black text-sky-700">تعديل التقرير</p>
                <h1 className="mt-1 text-[1.55rem] font-black leading-tight tracking-tight">
                  تعديل بيانات التقرير
                </h1>
              </div>

              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 text-sky-700 ring-1 ring-sky-100">
                <MobileIcon name="spark" className="h-5 w-5" />
              </span>
            </div>

            <p className="mt-3 text-sm font-bold leading-7 text-slate-700">
              هذه الصفحة مخصصة للتعديل السريع على الحقول ووصف التنفيذ. لمراجعة التقرير
              النهائي استخدم صفحة التقرير الجاهز، ولشكل الطباعة استخدم نسخة A4 الكاملة.
            </p>
          </div>
        </section>

        <Link
          href={readyHref}
          className="flex h-11 items-center justify-center gap-2 rounded-[1.35rem] bg-white/80 text-sm font-black text-sky-700 ring-1 ring-white/90"
        >
          <MobileIcon name="arrow" className="h-4 w-4" />
          العودة للتقرير الجاهز
        </Link>

        <section className="rounded-[1.6rem] bg-white/85 p-4 shadow-sm ring-1 ring-white/90">
          <div className="space-y-3">
            <div className="rounded-[1.35rem] bg-sky-50/90 p-3 ring-1 ring-sky-100">
              <p className="text-[11px] font-black text-sky-700">عنوان التقرير</p>
              <p className="mt-1 text-sm font-black leading-7 text-slate-950">
                {payload.title || payload.caseInfo.title || "تقرير بدون عنوان"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-[1.35rem] bg-slate-50/90 p-3 ring-1 ring-slate-100">
                <p className="text-[11px] font-black text-slate-500">نوع التقرير</p>
                <p className="mt-1 text-sm font-black text-slate-900">
                  {selectedVariant.shortName}
                </p>
              </div>

              <div className="rounded-[1.35rem] bg-slate-50/90 p-3 ring-1 ring-slate-100">
                <p className="text-[11px] font-black text-slate-500">القالب</p>
                <p className="mt-1 text-sm font-black text-slate-900">
                  {selectedTemplate?.name || "عرض محمول"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-[1.35rem] bg-white p-3 text-center ring-1 ring-sky-100">
                <p className="text-lg font-black text-sky-700">{selectedFieldsCount}</p>
                <p className="mt-1 text-[10px] font-bold text-slate-500">حقول</p>
              </div>

              <div className="rounded-[1.35rem] bg-white p-3 text-center ring-1 ring-sky-100">
                <p className="text-lg font-black text-sky-700">{evidenceCount}</p>
                <p className="mt-1 text-[10px] font-bold text-slate-500">شواهد</p>
              </div>

              <div className="rounded-[1.35rem] bg-white p-3 text-center ring-1 ring-sky-100">
                <p className="text-lg font-black text-sky-700">{summaryWords}</p>
                <p className="mt-1 text-[10px] font-bold text-slate-500">كلمة</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.6rem] bg-white/85 p-4 shadow-sm ring-1 ring-white/90">
          <div className="mb-3">
            <h2 className="text-base font-black text-slate-950">قائمة الجاهزية</h2>
            <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
              تتحدث مباشرة حسب تعديلاتك الحالية داخل صفحة التعديل السريع.
            </p>
          </div>

          <div className="space-y-2.5">
            {checklist.map((item, index) => (
              <article
                key={item.id}
                className="rounded-[1.35rem] bg-slate-50/90 p-3 ring-1 ring-slate-100"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={[
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-xs font-black",
                      item.status === "ready"
                        ? "bg-sky-100 text-sky-700"
                        : "bg-white text-slate-400 ring-1 ring-slate-200",
                    ].join(" ")}
                  >
                    {index + 1}
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-950">
                        {item.title}
                      </h3>
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-[10px] font-black",
                          item.status === "ready"
                            ? "bg-sky-50 text-sky-700"
                            : "bg-amber-50 text-amber-700",
                        ].join(" ")}
                      >
                        {item.status === "ready" ? "جاهز" : "بانتظار"}
                      </span>
                    </div>

                    <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                      {item.description}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {approvedSnapshot ? (
          <section className="rounded-[1.6rem] bg-sky-50/90 p-4 shadow-sm ring-1 ring-sky-100">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700 ring-1 ring-sky-100">
                <MobileIcon name="shield" className="h-5 w-5" />
              </span>

              <div>
                <h2 className="text-sm font-black text-slate-950">تقرير معتمد</h2>
                <p className="mt-1 text-xs font-bold leading-6 text-slate-600">
                  يوجد تقرير معتمد مسبقًا لهذه الحالة. هذا لا يغيّر مسارات لوحة
                  التحكم أو سلوكها.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <div className="space-y-2">
          <button
            type="button"
            onClick={startEditing}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-[1.45rem] bg-sky-600 text-base font-black text-white shadow-xl shadow-sky-200 transition hover:bg-sky-700"
          >
            بدء تعديل البيانات
            <MobileIcon name="spark" className="h-4 w-4" />
          </button>
        </div>

        <section
          ref={editorRef}
          className="rounded-[1.6rem] bg-white/85 p-4 shadow-sm ring-1 ring-white/90"
        >
          <div className="mb-4">
            <h2 className="text-base font-black text-slate-950">أدوات التعديل السريع</h2>
            <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
              عدّل عناصر التقرير من الجوال ثم احفظها في نفس تخزين report-flow المستخدم في المسار الكامل.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pb-1 sm:grid-cols-4">
            {tabs.map((tab) => {
              const active = tab.id === activeTab;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "flex h-12 items-center justify-center gap-2 rounded-[1.25rem] px-3 text-xs font-black transition",
                    active
                      ? "bg-sky-100 text-sky-700 ring-1 ring-sky-200"
                      : "bg-slate-50 text-slate-500 ring-1 ring-slate-100",
                  ].join(" ")}
                >
                  <MobileIcon name={tab.icon} className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            {activeTab === "fields" ? (
              <MobileReportStudioFieldEditor
                fields={fields}
                search={search}
                onSearchChange={setSearch}
                onFieldChange={updateField}
              />
            ) : null}

            {activeTab === "summary" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-[10px] font-black text-sky-700 ring-1 ring-sky-100">
                    {summarySource === "AI"
                      ? "مولد"
                      : summarySource === "MANUAL"
                        ? "معدل يدويًا"
                        : "افتراضي"}
                  </span>

                  <span className="text-[11px] font-bold text-slate-400">
                    {summaryWords} / 80 كلمة
                  </span>
                </div>

                <textarea
                  value={executionSummary}
                  onChange={(event) => {
                    setExecutionSummary(limitWords(event.target.value, 80));
                    setSummarySource("MANUAL");
                  }}
                  rows={9}
                  placeholder="اكتب وصف التنفيذ هنا"
                  className="w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-7 text-slate-950 outline-none transition focus:border-sky-300 focus:bg-white"
                />

                <div className="rounded-[1.2rem] bg-sky-50/70 p-3 ring-1 ring-sky-100">
                  <p className="text-xs font-black text-sky-700">ملاحظة</p>
                  <p className="mt-1 text-sm font-bold leading-7 text-slate-700">
                    سيتم حفظ وصف التنفيذ هنا ضمن نفس التحضير المقروء من dashboard
                    report-2.
                  </p>
                </div>
              </div>
            ) : null}

            {activeTab === "evidence" ? (
              <div className="space-y-3">
                <div className="rounded-[1.25rem] bg-sky-50/90 p-3 ring-1 ring-sky-100">
                  <p className="text-xs font-black text-sky-700">عدد الشواهد</p>
                  <p className="mt-1 text-base font-black text-slate-950">
                    {evidenceCount} شاهد
                  </p>
                </div>

                <div className="space-y-2">
                  {evidenceItems.map((item, index) => (
                    <div
                      key={item.id || `evidence-${index}`}
                      className="rounded-[1.25rem] bg-slate-50/90 p-3 ring-1 ring-slate-100"
                    >
                      <p className="text-sm font-black text-slate-950">
                        {cleanText(item.title) ||
                          cleanText(item.caption) ||
                          `شاهد ${index + 1}`}
                      </p>
                    </div>
                  ))}

                  {!evidenceItems.length ? (
                    <div className="rounded-[1.25rem] bg-slate-50 p-4 text-center text-sm font-bold text-slate-500 ring-1 ring-slate-100">
                      لا توجد أسماء شواهد لعرضها الآن.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {activeTab === "preview" ? (
              <div className="space-y-3">
                {!previewPreparation ? (
                  <div className="space-y-3">
                    <div className="rounded-[1.35rem] bg-amber-50/90 p-4 ring-1 ring-amber-100">
                      <p className="text-sm font-black text-amber-900">
                        المراجعة تحتاج حقولًا محفوظة
                      </p>
                      <p className="mt-2 text-sm font-bold leading-7 text-amber-800">
                        اختر حقلًا واحدًا على الأقل ثم احفظ التعديلات أو عد إلى
                        تبويب الحقول لإكمال التحضير.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab("fields")}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-[1.35rem] bg-sky-50 text-sm font-black text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-100"
                    >
                      العودة للحقول
                      <MobileIcon name="arrow" className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <MobileReportReadablePreview
                      caseId={caseId}
                      payload={payload}
                      selectedVariantId={selectedVariant.id}
                      selectedTemplate={selectedTemplate}
                      preparation={previewPreparation}
                    />

                    <div className="space-y-2">
                      <Link
                        href={readyHref}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-[1.35rem] bg-white text-sm font-black text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-50"
                      >
                        العودة للتقرير الجاهز
                        <MobileIcon name="arrow" className="h-4 w-4" />
                      </Link>

                      <Link
                        href={a4Href}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-[1.35rem] bg-sky-50 text-sm font-black text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-100"
                      >
                        فتح نسخة A4 كاملة
                        <MobileIcon name="file" className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </section>

        <div className="space-y-2">
          <button
            type="button"
            onClick={saveChanges}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[1.35rem] bg-sky-600 text-sm font-black text-white shadow-lg shadow-sky-200 transition hover:bg-sky-700"
          >
            حفظ التعديلات
            <MobileIcon name="file" className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={openPreviewTab}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[1.35rem] bg-sky-50 text-sm font-black text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-100"
          >
            مراجعة النسخة الجاهزة
            <MobileIcon name="shield" className="h-4 w-4" />
          </button>

          <Link
            href={fullStudioHref}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[1.35rem] bg-white text-sm font-black text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-50"
          >
            فتح الاستديو الكامل على الكمبيوتر
            <MobileIcon name="spark" className="h-4 w-4" />
          </Link>

          <p className="px-1 text-center text-[11px] font-bold leading-6 text-slate-400">
            يفضل استخدام الكمبيوتر لتعديل التصميم والتوزيع الكامل.
          </p>
        </div>

        <SectionCard title="بيانات الحالة">
          <div className="space-y-2">
            <div className="rounded-[1.25rem] bg-slate-50/90 p-3 ring-1 ring-slate-100">
              <p className="text-[11px] font-black text-slate-500">الخدمة</p>
              <p className="mt-1 text-sm font-black text-slate-950">
                {payload.service.name}
              </p>
            </div>

            <div className="rounded-[1.25rem] bg-slate-50/90 p-3 ring-1 ring-slate-100">
              <p className="text-[11px] font-black text-slate-500">تاريخ الحالة</p>
              <p className="mt-1 text-sm font-black text-slate-950">
                {formatDate(payload.caseInfo.createdAt)}
              </p>
            </div>

            {payload.student?.name ? (
              <div className="rounded-[1.25rem] bg-slate-50/90 p-3 ring-1 ring-slate-100">
                <p className="text-[11px] font-black text-slate-500">الطالب</p>
                <p className="mt-1 text-sm font-black text-slate-950">
                  {payload.student.name}
                </p>
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>

      <MobilePopCard
        open={feedback.open}
        title={feedback.title}
        description={feedback.description}
        variant={feedback.variant}
        onClose={() =>
          setFeedback((current) => ({
            ...current,
            open: false,
          }))
        }
      />
    </MobileAppShell>
  );
}
