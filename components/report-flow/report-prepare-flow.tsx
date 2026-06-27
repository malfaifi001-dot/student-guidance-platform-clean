"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";

import { ReportDocumentEditor } from "@/components/report-engine/document-editor/report-document-editor";
import { buildReportDocumentDraftFromPayload } from "@/lib/report-engine/document-draft/report-document-builder";
import type { ReportDocumentDraft } from "@/lib/report-engine/document-draft/report-document-types";
import { saveReportDocumentDraft } from "@/lib/report-engine/document-draft/report-draft-storage";
import {
  applyReportLanguageModeToText,
  normalizeReportLanguageMode,
  type ReportLanguageMode,
} from "@/lib/report-engine/report-language-mode";
import type {
  ReportVariantConfig,
  ReportVariantId,
} from "@/lib/report-engine/report-variant-registry";
import type { SmartReportPayload } from "@/lib/report-engine/smart-report-types";
import {
  applyReportFlowLanguageModeToFields,
  applyReportFlowPreparationToPayload,
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

type ReportPrepareFlowProps = {
  payload: SmartReportPayload;
  selectedVariantId: ReportVariantId;
  variants: ReportVariantConfig[];
  continueHref?: string;
};

type PrepareStep = "prepare" | "studio";

const EXECUTION_SUMMARY_MAX_WORDS = 40;

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function isLikelyEnglishOnlyLabel(value: unknown) {
  const text = cleanText(value);

  return Boolean(text) && /^[a-z0-9_\-.]+$/i.test(text) && !/[\u0600-\u06FF]/.test(text);
}

function countWords(value: string) {
  return cleanText(value).split(/\s+/).filter(Boolean).length;
}

function limitWords(value: string, maxWords = EXECUTION_SUMMARY_MAX_WORDS) {
  return cleanText(value).split(/\s+/).filter(Boolean).slice(0, maxWords).join(" ");
}

function getFieldSearchText(field: ReportFlowPrepareField) {
  return `${field.label} ${field.value} ${field.key}`.toLowerCase();
}

function buildInitialFields(payload: SmartReportPayload) {
  return buildReportFlowPrepareFields(payload);
}

function buildInitialSummary(payload: SmartReportPayload, languageMode: ReportLanguageMode) {
  return applyReportLanguageModeToText(payload.narrative.body, languageMode);
}

function buildInitialSummarySource(): ReportFlowExecutionSummarySource {
  return "FALLBACK";
}

export function ReportPrepareFlow({
  payload,
  selectedVariantId,
  variants,
  continueHref,
}: ReportPrepareFlowProps) {
  const router = useRouter();
  const initialLanguageMode = normalizeReportLanguageMode(payload.languageMode);

  const [step, setStep] = useState<PrepareStep>("prepare");
  const [hydratedFromStorage, setHydratedFromStorage] = useState(false);
  const [languageMode, setLanguageMode] =
    useState<ReportLanguageMode>(initialLanguageMode);
  const [fields, setFields] = useState<ReportFlowPrepareField[]>(() =>
    buildInitialFields(payload),
  );
  const [executionSummary, setExecutionSummary] = useState("");
  const [showExecutionDescriptionInReport, setShowExecutionDescriptionInReport] =
    useState(true);
  const [summarySource, setSummarySource] =
    useState<ReportFlowExecutionSummarySource>(() => buildInitialSummarySource());
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [documentDraft, setDocumentDraft] = useState<ReportDocumentDraft | null>(
    null,
  );
  const autoSummaryRequestedRef = useRef(false);

  const context = useMemo(
    () => ({
      ...buildReportFlowContext(payload),
      languageMode,
    }),
    [languageMode, payload],
  );

  const summarySourceLabel =
    summarySource === "AI"
      ? "تم توليد الوصف بالذكاء الاصطناعي"
      : summarySource === "FALLBACK"
        ? "تم استخدام وصف احتياطي"
        : "تم تعديل الوصف يدويًا";

  useEffect(() => {
    if (hydratedFromStorage) return;

    const saved = loadReportFlowPreparation(payload.caseInfo.id, selectedVariantId);

    const shouldIgnoreSavedPreparation =
      payload.service?.slug === "custom-report" &&
      saved?.fields?.some((field) => isLikelyEnglishOnlyLabel(field.label));

    if (saved?.fields?.length && !shouldIgnoreSavedPreparation) {
      const savedMode = normalizeReportLanguageMode(saved.languageMode);
      setLanguageMode(savedMode);
      setFields(applyReportFlowLanguageModeToFields(saved.fields, savedMode));
      setShowExecutionDescriptionInReport(
        saved.showExecutionDescriptionInReport !== false,
      );
      setExecutionSummary(String(saved.executionSummary || ""));
      setSummarySource(saved.executionSummarySource || "FALLBACK");
      setHydratedFromStorage(true);
      return;
    }

    setHydratedFromStorage(true);
  }, [hydratedFromStorage, initialLanguageMode, payload, selectedVariantId]);

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

  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) || variants[0];

  function applyLanguageMode(nextMode: ReportLanguageMode) {
    const normalizedMode = normalizeReportLanguageMode(nextMode);
    const nextFields = applyReportFlowLanguageModeToFields(fields, normalizedMode);

    setLanguageMode(normalizedMode);
    setFields(nextFields);
    setMessage("تم تحديث مرجع الطالب في الوصف. أعد توليد وصف التنفيذ إذا رغبت في صياغة جديدة.");
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

  function selectAllVisible() {
    const visibleIds = new Set(visibleFields.map((field) => field.id));

    setFields((current) =>
      current.map((field) =>
        visibleIds.has(field.id)
          ? {
              ...field,
              selected: true,
            }
          : field,
      ),
    );
  }

  function unselectAllVisible() {
    const visibleIds = new Set(visibleFields.map((field) => field.id));

    setFields((current) =>
      current.map((field) =>
        visibleIds.has(field.id)
          ? {
              ...field,
              selected: false,
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
      variantId: selectedVariantId,
      fields,
      executionSummary: summary,
      executionSummarySource: source,
      languageMode,
      showExecutionDescriptionInReport,
    });
  }

  useEffect(() => {
    if (!hydratedFromStorage) return;

    saveReportFlowPreparation(buildPreparation());
  }, [
    executionSummary,
    fields,
    hydratedFromStorage,
    languageMode,
    showExecutionDescriptionInReport,
    summarySource,
  ]);

  function updateExecutionDescriptionVisibility(visible: boolean) {
    setShowExecutionDescriptionInReport(visible);
  }

  function handleExecutionSummaryChange(nextValue: string) {
    setExecutionSummary(nextValue);
    setSummarySource("MANUAL");
  }

  async function generateSummary(options?: { auto?: boolean }) {
    if (selectedFields.length === 0) {
      if (!options?.auto) {
        setMessage("اختر حقلًا واحدًا على الأقل قبل توليد وصف التنفيذ.");
      }
      return;
    }

    setGenerating(true);
    setMessage(
      options?.auto ? "جارٍ توليد وصف التنفيذ من بيانات الحالة..." : "",
    );

    try {
      const response = await fetch(
        `/api/dashboard/reports/case/${payload.caseInfo.id}/execution-summary`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            context: {
              ...context,
              languageMode,
            },
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

      const nextSummary = cleanText(String(data.summary || ""));
      const nextSource = data?.source === "AI" ? "AI" : "FALLBACK";

      setExecutionSummary(nextSummary);
      setSummarySource(nextSource);
      setMessage(
        nextSource === "AI"
          ? "تم تجهيز وصف التنفيذ من بيانات الحالة."
          : "تم تجهيز وصف احتياطي من بيانات الحالة.",
      );
    } catch {
      const fallbackSummary = cleanText(buildInitialSummary(payload, languageMode));

      if (!cleanText(executionSummary) && fallbackSummary) {
        setExecutionSummary(fallbackSummary);
        setSummarySource("FALLBACK");
      }

      setMessage(
        "تعذر توليد الوصف الآن. يمكنك تعديل النص يدويًا أو إعادة المحاولة.",
      );
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    if (!hydratedFromStorage || autoSummaryRequestedRef.current) return;
    if (summarySource === "MANUAL") return;
    if (cleanText(executionSummary)) return;
    if (selectedFields.length === 0) return;

    autoSummaryRequestedRef.current = true;
    void generateSummary({ auto: true });
  }, [
    executionSummary,
    hydratedFromStorage,
    selectedFields.length,
    summarySource,
  ]);

  function continueToStudio() {
    if (generating) {
      setMessage("انتظر حتى يكتمل تجهيز وصف التنفيذ ثم تابع.");
      return;
    }

    if (selectedFields.length === 0) {
      setMessage("اختر حقلًا واحدًا على الأقل للمتابعة.");
      return;
    }

    const safeSummary =
      limitWords(executionSummary, EXECUTION_SUMMARY_MAX_WORDS) ||
      buildInitialSummary(payload, languageMode) ||
      "";

    const nextSummarySource =
      cleanText(safeSummary) && summarySource ? summarySource : "FALLBACK";

    const preparation = buildPreparation(safeSummary, nextSummarySource);

    saveReportFlowPreparation(preparation);

    if (continueHref) {
      router.push(continueHref);
      return;
    }

    const preparedPayload = applyReportFlowPreparationToPayload(
      payload,
      preparation,
    );

    const nextDraft = buildReportDocumentDraftFromPayload({
      payload: preparedPayload,
      variantId: selectedVariantId,
      evidenceConfig: preparedPayload.evidenceConfig,
    });

    saveReportDocumentDraft(nextDraft);
    setDocumentDraft(nextDraft);
    setStep("studio");
  }

  function handleDraftChange(nextDraft: ReportDocumentDraft) {
    saveReportDocumentDraft(nextDraft);
  }

  if (step === "studio" && documentDraft) {
    return (
      <main
        className="min-h-screen bg-slate-50 px-4 py-5 transition-colors dark:bg-slate-950 sm:px-6"
        dir="rtl"
      >
        <div className="mx-auto max-w-7xl space-y-5">
          <section className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition-colors lg:flex-row lg:items-center lg:justify-between print:hidden dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/30">
            <div>
              <p className="text-sm font-black text-emerald-700">المعاينة والتعديل</p>
              <h1 className="mt-1 text-2xl font-black text-slate-950">
                {documentDraft.title}
              </h1>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                تم تجهيز التقرير من الحقول التي اخترتها فقط.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setStep("prepare")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              العودة للتحضير
            </button>
          </section>

          <ReportDocumentEditor
            initialDraft={documentDraft}
            onDraftChange={handleDraftChange}
          />
        </div>
      </main>
    );
  }

  return (
    <>
      <main
        className="min-h-screen bg-slate-50 px-4 py-5 transition-colors dark:bg-slate-950 sm:px-6"
        dir="rtl"
      >
        <div className="mx-auto max-w-6xl space-y-5">
          <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-sky-900 to-sky-600 p-8 text-white shadow-xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-black text-sky-100">
                  تحضير التقرير
                </p>

                <h1 className="mt-2 text-3xl font-black leading-tight lg:text-4xl">
                  راجع عناصر التقرير قبل المعاينة
                </h1>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-black text-sky-100/90">
                  <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
                    {payload.title || payload.caseInfo.title}
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
                    {payload.service.name}
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
                    {selectedVariant?.shortName || selectedVariant?.name || "تقرير"}
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
                    {selectedFields.length} من {fields.length} حقل
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/cases/${payload.caseInfo.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/20"
                >
                  <ArrowRight className="h-4 w-4" />
                  العودة للحالة
                </Link>

                <button
                  type="button"
                  onClick={continueToStudio}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-sky-50"
                >
                  معاينة التقرير
                  <CheckCircle2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
          {message ? (
            <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              {message}
            </div>
          ) : null}

          <section className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]">
            <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/30">
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-950 dark:text-white">
                    عناصر التقرير
                  </h2>
                  <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-300">
                    اختر فقط ما تريد ظهوره في التقرير. التعديل هنا لا يغيّر أصل
                    الحالة.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={selectAllVisible}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    تحديد الظاهر
                  </button>

                  <button
                    type="button"
                    onClick={unselectAllVisible}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    إلغاء الظاهر
                  </button>
                </div>
              </div>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث في الحقول..."
                className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-300 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-950"
              />

              <div className="mt-4 max-h-[680px] space-y-3 overflow-y-auto pr-1">
                {visibleFields.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                    لا توجد حقول مطابقة للبحث.
                  </div>
                ) : null}

                {visibleFields.map((field) => (
                  <article
                    key={field.id}
                    className={[
                      "rounded-2xl border p-4 transition",
                      field.selected
                        ? "border-emerald-100 bg-emerald-50/30 dark:border-emerald-400/20 dark:bg-emerald-500/10"
                        : "border-slate-100 bg-slate-50/60 opacity-80 dark:border-slate-800 dark:bg-slate-900/70",
                    ].join(" ")}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <label className="flex cursor-pointer items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={field.selected}
                          onChange={(event) =>
                            updateField(field.id, {
                              selected: event.target.checked,
                            })
                          }
                          className="h-4 w-4 accent-emerald-700"
                        />
                        عرض في التقرير
                      </label>

                      {field.technical ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-500">
                          مخفي ًا
                        </span>
                      ) : null}
                    </div>

                    <label className="mb-1 block text-[10px] font-black text-slate-500 dark:text-slate-400">
                      اسم الحقل
                    </label>
                    <input
                      value={field.label}
                      onChange={(event) =>
                        updateField(field.id, { label: event.target.value })
                      }
                      className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800 outline-none transition focus:border-emerald-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />

                    <label className="mb-1 block text-[10px] font-black text-slate-500 dark:text-slate-400">
                      القيمة
                    </label>
                    <textarea
                      value={field.value}
                      onChange={(event) =>
                        updateField(field.id, { value: event.target.value })
                      }
                      rows={2}
                      className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black leading-6 text-slate-950 outline-none transition focus:border-emerald-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </article>
                ))}
              </div>
            </div>

            <aside className="space-y-4">
              <section className="rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/30">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-slate-950 dark:text-white">
                      وصف التنفيذ
                    </h2>
                  </div>
                </div>

                <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={showExecutionDescriptionInReport}
                    onChange={(event) =>
                      updateExecutionDescriptionVisibility(event.target.checked)
                    }
                    className="h-4 w-4 accent-emerald-700"
                  />
                  <CheckCircle2
                    className={[
                      "h-4 w-4 transition",
                      showExecutionDescriptionInReport
                        ? "text-emerald-700"
                        : "text-slate-300 dark:text-slate-600",
                    ].join(" ")}
                  />
                  عرض في التقرير
                </label>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => applyLanguageMode("MALE")}
                    className={[
                      "rounded-2xl px-4 py-3 text-sm font-black transition",
                      languageMode === "MALE"
                        ? "bg-emerald-700 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                    aria-pressed={languageMode === "MALE"}
                  >
                    <span>طالب</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyLanguageMode("FEMALE")}
                    className={[
                      "rounded-2xl px-4 py-3 text-sm font-black transition",
                      languageMode === "FEMALE"
                        ? "bg-emerald-700 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                    aria-pressed={languageMode === "FEMALE"}
                  >
                    <span>طالبة</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => void generateSummary()}
                  disabled={generating || selectedFields.length === 0}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {executionSummary
                    ? "إعادة توليد وصف التنفيذ"
                    : "توليد وصف التنفيذ"}
                </button>

                <textarea
                  value={executionSummary}
                  onChange={(event) =>
                    handleExecutionSummaryChange(event.target.value)
                  }
                  rows={5}
                  placeholder="اكتب أو ولّد وصف التنفيذ..."
                  className="mt-4 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-8 text-slate-950 outline-none transition focus:border-emerald-300 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-950"
                />

                <div
                  className={[
                    "mt-2 flex items-center justify-between text-[11px] font-bold dark:text-slate-500",
                    countWords(executionSummary) > EXECUTION_SUMMARY_MAX_WORDS
                      ? "text-amber-600"
                      : "text-slate-400",
                  ].join(" ")}
                >
                  <span>{summarySourceLabel}</span>
                  <span>{countWords(executionSummary)} / 40</span>
                </div>
              </section>
            </aside>
          </section>
        </div>
      </main>
    </>
  );
}
