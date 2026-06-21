"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";

import { MobileAppShell } from "@/components/mobile/mobile-app-shell";
import { MobileIcon } from "@/components/mobile/mobile-icons";
import { MobilePopCard } from "@/components/mobile/mobile-pop-card";
import type {
  ReportVariantConfig,
  ReportVariantId,
} from "@/lib/report-engine/report-variant-registry";
import type { SmartReportPayload } from "@/lib/report-engine/smart-report-types";
import {
  buildReportFlowContext,
  buildReportFlowPrepareFields,
  createReportFlowPreparation,
} from "@/lib/report-flow/report-flow-payload";
import {
  loadReportFlowPreparation,
  saveReportFlowPreparation,
} from "@/lib/report-flow/report-flow-storage";
import type {
  ReportFlowExecutionSummarySource,
  ReportFlowPrepareField,
  ReportFlowPreparation,
} from "@/lib/report-flow/report-flow-types";

export type MobileReportTemplateOption = {
  id: string;
  name: string;
  description: string;
  serviceSlug: string | null;
  updatedAt: string;
  templateJson?: Record<string, unknown> | null;
};

type MobileReportPrepareFlowProps = {
  caseId: string;
  payload: SmartReportPayload;
  selectedVariantId: ReportVariantId;
  variants: ReportVariantConfig[];
  templates: MobileReportTemplateOption[];
  initialTemplateId?: string;
};

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
  return cleanText(value).split(/\s+/).filter(Boolean).slice(0, maxWords).join(" ");
}

function buildInitialSummary(payload: SmartReportPayload) {
  return cleanText(payload.narrative.body);
}

function buildInitialSummarySource(): ReportFlowExecutionSummarySource {
  return "FALLBACK";
}

function getFieldSearchText(field: ReportFlowPrepareField) {
  return `${field.label} ${field.value} ${field.key}`.toLowerCase();
}
function HeroCard({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-[1.8rem] bg-gradient-to-br from-[#064967] to-[#075f7a] p-4 text-white shadow-xl shadow-sky-900/20">
      <div className="absolute -left-12 -top-12 h-32 w-32 rounded-full bg-sky-200/70 blur-2xl" />
      <div className="absolute -bottom-16 right-10 h-36 w-36 rounded-full bg-cyan-100/80 blur-2xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black text-sky-100">تقرير الجوال</p>
            <h1 className="mt-1 text-[1.55rem] font-black leading-tight tracking-tight">
              {title}
            </h1>
          </div>

          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/20">
            <MobileIcon name="file" className="h-5 w-5" />
          </span>
        </div>

        <p className="mt-3 text-sm font-bold leading-7 text-sky-50/90">
          {subtitle}
        </p>
      </div>
    </section>
  );
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
    <section className="rounded-[1.6rem] bg-white/95 p-4 shadow-sm ring-1 ring-sky-100/70 backdrop-blur-xl">
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

export function MobileReportPrepareFlow({
  caseId,
  payload,
  selectedVariantId,
  variants,
  templates,
  initialTemplateId = "",
}: MobileReportPrepareFlowProps) {
  const router = useRouter();
  void variants;
  void templates;
  const context = useMemo(() => buildReportFlowContext(payload), [payload]);
  const [activeVariantId] = useState<ReportVariantId>(selectedVariantId);
  const [activeTemplateId] = useState(initialTemplateId);
  const [hydratedVariantId, setHydratedVariantId] = useState<string>("");
  const [fields, setFields] = useState<ReportFlowPrepareField[]>(() =>
    buildReportFlowPrepareFields(payload),
  );
  const [executionSummary, setExecutionSummary] = useState(() =>
    buildInitialSummary(payload),
  );
  const [summarySource, setSummarySource] =
    useState<ReportFlowExecutionSummarySource>(() => buildInitialSummarySource());
  const [search, setSearch] = useState("");
  const [fieldsPanelOpen, setFieldsPanelOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({
    open: false,
    title: "",
    description: "",
    variant: "info",
  });

  useEffect(() => {
    const saved = loadReportFlowPreparation(payload.caseInfo.id, activeVariantId);

    if (saved?.fields?.length) {
      setFields(saved.fields);
      setExecutionSummary(
        cleanText(saved.executionSummary) || cleanText(payload.narrative.body),
      );
      setSummarySource(saved.executionSummarySource || "FALLBACK");
      setHydratedVariantId(activeVariantId);
      return;
    }

    setFields(buildReportFlowPrepareFields(payload));
    setExecutionSummary(buildInitialSummary(payload));
    setSummarySource(buildInitialSummarySource());
    setHydratedVariantId(activeVariantId);
  }, [activeVariantId, payload]);
const selectedFields = useMemo(
    () =>
      fields
        .filter((field) => field.selected)
        .filter((field) => cleanText(field.label) && cleanText(field.value)),
    [fields],
  );

  const visibleFields = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return fields;

    return fields.filter((field) => getFieldSearchText(field).includes(query));
  }, [fields, search]);

  function openFeedback(
    variant: FeedbackState["variant"],
    title: string,
    description?: string,
  ) {
    setFeedback({
      open: true,
      variant,
      title,
      description,
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

  function buildPreparation(
    summary = executionSummary,
    source = summarySource,
  ): ReportFlowPreparation {
    return createReportFlowPreparation({
      payload,
      variantId: activeVariantId,
      fields,
      executionSummary: summary,
      executionSummarySource: source,
      languageMode: payload.languageMode,
    });
  }

  async function generateSummary() {
    if (selectedFields.length === 0) {
      openFeedback(
        "warning",
        "لا توجد حقول مختارة",
        "اختر حقلاً واحدًا على الأقل قبل توليد وصف التنفيذ.",
      );
      return;
    }

    setGenerating(true);

    try {
      const response = await fetch(
        `/api/dashboard/reports/case/${payload.caseInfo.id}/execution-summary`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            context,
            fields: selectedFields.map((field) => ({
              key: field.key,
              label: field.label,
              value: field.value,
            })),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "تعذر توليد وصف التنفيذ.");
      }

      const nextSummary = limitWords(String(data.summary || ""), 80);
      const nextSource = data.source === "AI" ? "AI" : "FALLBACK";

      setExecutionSummary(nextSummary);
      setSummarySource(nextSource);
      saveReportFlowPreparation(buildPreparation(nextSummary, nextSource));

      openFeedback(
        nextSource === "AI" ? "success" : "info",
        "تم تحديث وصف التنفيذ",
        nextSource === "AI"
          ? "تم توليد وصف التنفيذ من الحقول المختارة."
          : "تم إنشاء وصف احتياطي من الحقول المختارة.",
      );
    } catch (error) {
      openFeedback(
        "error",
        "تعذر توليد الوصف",
        error instanceof Error
          ? error.message
          : "يمكنك كتابة وصف التنفيذ يدويًا الآن.",
      );
    } finally {
      setGenerating(false);
    }
  }

  function continueToStudio() {
    if (selectedFields.length === 0) {
      openFeedback(
        "warning",
        "أكمل التحضير أولاً",
        "اختر الحقول التي تريد ظهورها في التقرير قبل المتابعة.",
      );
      return;
    }

    const safeSummary =
      limitWords(executionSummary, 80) || cleanText(payload.narrative.body);

    if (!safeSummary) {
      openFeedback(
        "warning",
        "وصف التنفيذ فارغ",
        "أدخل وصف التنفيذ أو ولّده من الحقول المختارة قبل المتابعة.",
      );
      return;
    }

    const preparation = buildPreparation(
      safeSummary,
      summarySource === "AI" ? "AI" : "MANUAL",
    );

    saveReportFlowPreparation(preparation);

    const query = new URLSearchParams();
    query.set("variant", activeVariantId);

    if (activeTemplateId) {
      query.set("templateId", activeTemplateId);
    }

    router.push(
      `/mobile/counselor/report-2/cases/${encodeURIComponent(caseId)}/ready?${query.toString()}`,
    );
  }

  return (
    <MobileAppShell activeSection="reports">
      <div className="space-y-4" dir="rtl">
        <HeroCard
          title="تحضير تقرير ٢"
          subtitle="راجع القالب والحقول ووصف التنفيذ قبل الانتقال إلى التقرير الجاهز للمراجعة."
        />

        <Link
          href={`/mobile/counselor/cases/${encodeURIComponent(caseId)}`}
          className="flex h-11 items-center justify-center gap-2 rounded-[1.35rem] bg-white/80 text-sm font-black text-sky-700 ring-1 ring-white/90"
        >
          <MobileIcon name="arrow" className="h-4 w-4" />
          العودة إلى الحالة
        </Link>
        <section className="overflow-hidden rounded-[1.7rem] bg-white p-0 shadow-sm ring-1 ring-slate-100">
          <button
            type="button"
            onClick={() => setFieldsPanelOpen((open) => !open)}
            aria-expanded={fieldsPanelOpen}
            className="flex w-full items-center justify-between gap-3 p-4 text-right transition active:scale-[0.995]"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-black text-sky-700">
                الحقول المختارة
              </p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                {selectedFields.length} من أصل {fields.length} حقل
              </h2>
              <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                اضغط لعرض الحقول وتعديل طريقة ظهورها داخل التقرير.
              </p>
            </div>

            <span
              className={[
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-sky-700 ring-1 ring-slate-100 transition",
                fieldsPanelOpen ? "-rotate-90" : "rotate-0",
              ].join(" ")}
            >
              <MobileIcon name="arrow" className="h-5 w-5" />
            </span>
          </button>

          {fieldsPanelOpen ? (
            <div className="border-t border-slate-100 p-4">
<div className="space-y-3">
            <div className="rounded-[1.35rem] bg-slate-50/90 p-3 ring-1 ring-slate-100">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-black text-slate-500">الحالة الحالية</p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    {selectedFields.length} من أصل {fields.length} حقل
                  </p>
                </div>

                {hydratedVariantId === activeVariantId ? (
                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-sky-700 ring-1 ring-sky-100">
                    تم تحميل التحضير
                  </span>
                ) : null}
              </div>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث داخل الحقول"
              className="h-12 w-full rounded-[1.35rem] border border-sky-100 bg-sky-50/70 px-4 text-sm font-bold text-slate-950 outline-none transition focus:border-sky-300 focus:bg-white"
            />

            <div className="space-y-2.5">
              {visibleFields.map((field) => (
                <article
                  key={field.id}
                  className={[
                    "rounded-[1.45rem] p-3 transition",
                    field.selected
                      ? "bg-white ring-1 ring-sky-100"
                      : "bg-slate-50/90 ring-1 ring-slate-100",
                  ].join(" ")}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs font-black text-slate-700">
                      <input
                        type="checkbox"
                        checked={field.selected}
                        onChange={(event) =>
                          updateField(field.id, { selected: event.target.checked })
                        }
                        className="h-4 w-4 accent-sky-600"
                      />
                      إظهار في التقرير
                    </label>

                    {field.technical ? (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700 ring-1 ring-amber-100">
                        تقني
                      </span>
                    ) : null}
                  </div>

                  <label className="text-[10px] font-black text-slate-400">
                    اسم الحقل
                  </label>
                  <input
                    value={field.label}
                    onChange={(event) =>
                      updateField(field.id, { label: event.target.value })
                    }
                    className="mt-1 h-11 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-950 outline-none transition focus:border-sky-300 focus:bg-white"
                  />

                  <label className="mt-3 block text-[10px] font-black text-slate-400">
                    القيمة المعروضة
                  </label>
                  <textarea
                    value={field.value}
                    onChange={(event) =>
                      updateField(field.id, { value: event.target.value })
                    }
                    rows={3}
                    className="mt-1 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold leading-7 text-slate-950 outline-none transition focus:border-sky-300 focus:bg-white"
                  />
                </article>
              ))}

              {!visibleFields.length ? (
                <div className="rounded-[1.35rem] bg-slate-50 p-4 text-center text-sm font-bold text-slate-500 ring-1 ring-slate-100">
                  لا توجد نتائج مطابقة للبحث الحالي.
                </div>
              ) : null}
            </div>
          </div>
            </div>
          ) : null}
        </section>

        <SectionCard
          title="وصف التنفيذ"
          description="يمكنك كتابته يدويًا أو توليده من الحقول المختارة، ويُحفظ بنفس تخزين التحضير المستخدم في لوحة التحكم."
        >
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
                {countWords(executionSummary)} / 80 كلمة
              </span>
            </div>

            <button
              type="button"
              onClick={generateSummary}
              disabled={generating || selectedFields.length === 0}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[1.35rem] bg-sky-600 text-sm font-black text-white shadow-lg shadow-sky-200 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generating ? "جارٍ التوليد..." : "توليد وصف التنفيذ"}
            </button>

            <textarea
              value={executionSummary}
              onChange={(event) => {
                setExecutionSummary(limitWords(event.target.value, 80));
                setSummarySource("MANUAL");
              }}
              rows={7}
              placeholder="اكتب وصف التنفيذ هنا"
              className="w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-7 text-slate-950 outline-none transition focus:border-sky-300 focus:bg-white"
            />
          </div>
        </SectionCard>

        <div className="space-y-2">
          <button
            type="button"
            onClick={continueToStudio}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-[1.45rem] bg-sky-600 text-base font-black text-white shadow-xl shadow-sky-200 transition hover:bg-sky-700"
          >
            المتابعة إلى التقرير الجاهز
            <MobileIcon name="arrow" className="h-4 w-4 rotate-180" />
          </button>          <p className="px-1 text-center text-[11px] font-bold leading-6 text-slate-400">
            سيتم تجهيز التقرير حسب إعدادات النظام، ثم فتح المعاينة مباشرة.
          </p></div>
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
