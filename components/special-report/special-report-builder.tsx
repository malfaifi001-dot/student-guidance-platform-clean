"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowDown,
  ArrowUp,
  Check,
  FileText,
  FolderOpen,
  Loader2,
  Pencil,
  Save,
  Sparkles,
  X,
} from "lucide-react";

import {
  DynamicFormRenderer,
  type EvidenceItem,
} from "@/components/workflow/dynamic-form-renderer";
import type { RuntimeValues } from "@/engine/runtime/field-dependency-engine";
import type { RuntimeWorkflow } from "@/engine/runtime/runtime-resolver";

import {
  SPECIAL_REPORT_FIELD_BANK,
  SPECIAL_REPORT_FIXED_FIELD_KEYS,
  SPECIAL_REPORT_PERFORMANCE_ELEMENTS,
} from "@/lib/special-report/catalog";

import type {
  SpecialReportRuntimeResponse,
} from "@/lib/special-report/types";

type BuilderPhase =
  | "performance"
  | "fields"
  | "order"
  | "form";

type TemplateConfig = {
  kind: "SPECIAL_REPORT_TEMPLATE";
  version: 1;
  performanceElement: string;
  fieldKeys: string[];
};

type SavedTemplate = {
  id: string;
  name: string;
  config: TemplateConfig;
};

type FeedbackState =
  | {
      type:
        | "success"
        | "error"
        | "info";

      title: string;

      message?: string;
    }
  | null;

const DEFAULT_FIELD_KEYS = [
  ...SPECIAL_REPORT_FIXED_FIELD_KEYS,

  "special_report_objectives",

  "special_report_execution_procedures",

  "special_report_results_outputs",
];

function filterValuesForWorkflow(
  values: RuntimeValues,
  workflow: RuntimeWorkflow
) {
  const validKeys = new Set(
    workflow.steps.flatMap((step) =>
      step.fields.map((field) => field.key)
    )
  );

  return Object.fromEntries(
    Object.entries(values).filter(([key]) => {
      if (validKeys.has(key)) {
        return true;
      }

      if (key.endsWith("__other")) {
        const baseKey = key.slice(0, -7);
        return validKeys.has(baseKey);
      }

      return false;
    })
  ) as RuntimeValues;
}

export function SpecialReportBuilder() {
  const [phase, setPhase] =
    useState<BuilderPhase>(
      "performance"
    );

  const [
    performanceElement,
    setPerformanceElement,
  ] = useState("");

  const [
    fieldKeys,
    setFieldKeys,
  ] = useState<string[]>(
    DEFAULT_FIELD_KEYS
  );

  const [
    runtime,
    setRuntime,
  ] =
    useState<SpecialReportRuntimeResponse | null>(
      null
    );
  const [
    runtimeInitialValues,
    setRuntimeInitialValues,
  ] = useState<RuntimeValues>({});
  const [
    runtimeEvidenceItems,
    setRuntimeEvidenceItems,
  ] = useState<EvidenceItem[]>([]);
  const [
    fieldLabelOverrides,
    setFieldLabelOverrides,
  ] = useState<Record<string, string>>(
    {}
  );

  const [
    templates,
    setTemplates,
  ] =
    useState<SavedTemplate[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    templateLoading,
    setTemplateLoading,
  ] = useState(false);

  const [
    showTemplateModal,
    setShowTemplateModal,
  ] = useState(false);

  const [
    templateName,
    setTemplateName,
  ] = useState("");

  const [
    feedback,
    setFeedback,
  ] =
    useState<FeedbackState>(null);

  useEffect(() => {
    void loadTemplates();
  }, []);

  useEffect(() => {
    if (!performanceElement) {
      return;
    }

    sessionStorage.setItem(
      "special-report-performance-element",
      performanceElement
    );
  }, [performanceElement]);

  useEffect(() => {
    const selectedLabels =
      fieldKeys
        .map(
          (key) =>
            SPECIAL_REPORT_FIELD_BANK.find(
              (field) =>
                field.key === key
            )?.label
        )
        .filter(Boolean);

    sessionStorage.setItem(
      "special-report-context",
      [
        `عنصر الأداء: ${performanceElement || "غير محدد"}`,

        `حقول التقرير: ${selectedLabels.join("، ")}`,
      ].join("\n")
    );
  }, [
    performanceElement,
    fieldKeys,
  ]);

  const selectedFields =
    useMemo(() => {
      return fieldKeys
        .map((key) =>
          SPECIAL_REPORT_FIELD_BANK.find(
            (field) =>
              field.key === key
          )
        )
        .filter(
          (
            field
          ): field is (typeof SPECIAL_REPORT_FIELD_BANK)[number] =>
            Boolean(field)
        );
    }, [fieldKeys]);

  function isFixedField(
    key: string
  ) {
    return SPECIAL_REPORT_FIXED_FIELD_KEYS.includes(
      key as (typeof SPECIAL_REPORT_FIXED_FIELD_KEYS)[number]
    );
  }

  async function loadTemplates() {
    try {
      const response = await fetch(
        "/api/dashboard/special-report/templates",
        {
          cache: "no-store",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "تعذر تحميل القوالب."
        );
      }

      setTemplates(
        Array.isArray(data.templates)
          ? data.templates
          : []
      );
    } catch (error) {
      console.error(
        "special report templates load failed",
        error
      );
    }
  }

  function useTemplate(
    template: SavedTemplate
  ) {
    setRuntime(null);
    setRuntimeInitialValues({});
    setRuntimeEvidenceItems([]);
    setFieldLabelOverrides({});

    setPerformanceElement(
      template.config.performanceElement
    );

    setFieldKeys(
      template.config.fieldKeys
    );

    setPhase("order");

    setFeedback({
      type: "info",

      title:
        `تم تحميل قالب: ${template.name}`,

      message:
        "راجع ترتيب الحقول ثم أنشئ النموذج.",
    });
  }

  function toggleField(
    key: string
  ) {
    if (isFixedField(key)) {
      return;
    }

    setFieldKeys((current) => {
      if (current.includes(key)) {
        return current.filter(
          (currentKey) =>
            currentKey !== key
        );
      }

      return [
        ...current,
        key,
      ];
    });
  }

  function moveField(
    key: string,
    direction: -1 | 1
  ) {
    if (isFixedField(key)) {
      return;
    }

    setFieldKeys((current) => {
      const currentIndex =
        current.indexOf(key);

      if (currentIndex === -1) {
        return current;
      }

      const fixedCount =
        SPECIAL_REPORT_FIXED_FIELD_KEYS.length;

      const targetIndex =
        currentIndex + direction;

      if (
        targetIndex < fixedCount ||
        targetIndex >= current.length
      ) {
        return current;
      }

      const next = [...current];

      [
        next[currentIndex],
        next[targetIndex],
      ] = [
        next[targetIndex],
        next[currentIndex],
      ];

      return next;
    });
  }

  async function createRuntime() {
    if (!performanceElement) {
      setFeedback({
        type: "error",
        title: "اختر عنصر الأداء",
      });

      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const response = await fetch(
        "/api/dashboard/special-report/runtime",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            performanceElement,
            fieldKeys,
            fieldLabelOverrides,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "تعذر إنشاء النموذج."
        );
      }

      const nextRuntime =
        data as SpecialReportRuntimeResponse;
      const preservedValues =
        filterValuesForWorkflow(
          runtimeInitialValues,
          nextRuntime.workflow as RuntimeWorkflow
        );

      setRuntime(nextRuntime);
      setRuntimeInitialValues(
        preservedValues
      );

      sessionStorage.setItem(
        "special-report-performance-element",
        performanceElement
      );

      setPhase("form");

      setFeedback({
        type: "success",

        title: "تم إنشاء النموذج",

        message:
          "النموذج يعمل الآن داخل DynamicFormRenderer المعتمد.",
      });
    } catch (error) {
      setFeedback({
        type: "error",

        title:
          "تعذر إنشاء النموذج",

        message:
          error instanceof Error
            ? error.message
            : "حدث خطأ غير متوقع.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function saveTemplate() {
    const name =
      templateName.trim();

    if (name.length < 3) {
      setFeedback({
        type: "error",

        title:
          "اسم القالب قصير",

        message:
          "اكتب اسمًا من 3 أحرف على الأقل.",
      });

      return;
    }

    setTemplateLoading(true);

    try {
      const response = await fetch(
        "/api/dashboard/special-report/templates",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name,

            performanceElement,

            fieldKeys,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "تعذر حفظ القالب."
        );
      }

      setTemplates((current) => [
        data.template,
        ...current,
      ]);

      setTemplateName("");

      setShowTemplateModal(false);

      setFeedback({
        type: "success",

        title:
          "تم حفظ قالب التقرير",

        message:
          "يمكن استخدامه لاحقًا بدون إعادة اختيار الحقول.",
      });
    } catch (error) {
      setFeedback({
        type: "error",

        title:
          "تعذر حفظ القالب",

        message:
          error instanceof Error
            ? error.message
            : "حدث خطأ غير متوقع.",
      });
    } finally {
      setTemplateLoading(false);
    }
  }

  const builderOpen =
    phase !== "form";

  return (
    <div
      dir="rtl"
      className="space-y-5"
    >
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sky-700">
              <Sparkles className="h-5 w-5" />

              <span className="text-xs font-black">
                منشئ التقرير الخاص
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-black text-slate-950">
              أنشئ تقريرًا حسب احتياجك
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-slate-500">
              اختر عنصر الأداء والحقول
              والترتيب، ثم عبّئ التقرير
              داخل المحرك الديناميكي المعتمد.
            </p>
          </div>

          {phase === "form" ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setPhase("fields")
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" />

                تعديل الحقول
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowTemplateModal(true)
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800"
              >
                <Save className="h-4 w-4" />

                حفظ كقالب
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {feedback ? (
        <section
          className={[
            "rounded-2xl border p-4",

            feedback.type === "error"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "",

            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "",

            feedback.type === "info"
              ? "border-sky-200 bg-sky-50 text-sky-800"
              : "",
          ].join(" ")}
        >
          <p className="text-sm font-black">
            {feedback.title}
          </p>

          {feedback.message ? (
            <p className="mt-1 text-sm font-semibold opacity-80">
              {feedback.message}
            </p>
          ) : null}
        </section>
      ) : null}

      {phase === "form" &&
      runtime ? (
        <DynamicFormRenderer
          key={runtime.workflow.id}
          workflow={runtime.workflow}
          serviceId={runtime.serviceId}
          requiresStudent={false}
          title="التقرير الخاص"
          initialValues={runtimeInitialValues}
          initialEvidenceItems={runtimeEvidenceItems}
          onValuesChange={setRuntimeInitialValues}
          onEvidenceItemsChange={setRuntimeEvidenceItems}
          onFieldLabelPersisted={(field) =>
            setFieldLabelOverrides(
              (current) => ({
                ...current,
                [field.key]: field.label,
              })
            )
          }
        />
      ) : null}

      {builderOpen ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[30px] border border-white/40 bg-white p-5 shadow-2xl md:p-7">
            <div className="mb-6">
              <p className="text-xs font-black text-sky-700">
                {phase === "performance"
                  ? "المرحلة 1 من 3"
                  : phase === "fields"
                    ? "المرحلة 2 من 3"
                    : "المرحلة 3 من 3"}
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-950">
                {phase === "performance"
                  ? "اختيار عنصر الأداء"
                  : phase === "fields"
                    ? "اختيار حقول التقرير"
                    : "ترتيب الحقول"}
              </h2>
            </div>

            {phase ===
            "performance" ? (
              <div className="space-y-5">
                {templates.length > 0 ? (
                  <section className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-violet-700" />

                      <p className="text-sm font-black text-violet-950">
                        قوالبي المحفوظة
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {templates.map(
                        (template) => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() =>
                              useTemplate(
                                template
                              )
                            }
                            className="rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-black text-violet-800 transition hover:border-violet-400 hover:bg-violet-50"
                          >
                            {template.name}
                          </button>
                        )
                      )}
                    </div>
                  </section>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                  {SPECIAL_REPORT_PERFORMANCE_ELEMENTS.map(
                    (element) => {
                      const selected =
                        performanceElement ===
                        element;

                      return (
                        <button
                          key={element}
                          type="button"
                          onClick={() =>
                            setPerformanceElement(
                              element
                            )
                          }
                          className={[
                            "flex min-h-16 items-center justify-between rounded-2xl border p-4 text-right text-sm font-black transition",

                            selected
                              ? "border-sky-500 bg-sky-50 text-sky-950 ring-4 ring-sky-100"
                              : "border-slate-200 bg-white text-slate-700 hover:border-sky-200",
                          ].join(" ")}
                        >
                          <span>
                            {element}
                          </span>

                          {selected ? (
                            <Check className="h-5 w-5" />
                          ) : null}
                        </button>
                      );
                    }
                  )}
                </div>

                <button
                  type="button"
                  disabled={
                    !performanceElement
                  }
                  onClick={() =>
                    setPhase("fields")
                  }
                  className="h-12 w-full rounded-2xl bg-sky-600 text-sm font-black text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  التالي: اختيار الحقول
                </button>
              </div>
            ) : null}

            {phase ===
            "fields" ? (
              <div className="space-y-5">
                <div className="grid gap-3 md:grid-cols-2">
                  {SPECIAL_REPORT_FIELD_BANK.map(
                    (field) => {
                      const selected =
                        fieldKeys.includes(
                          field.key
                        );

                      return (
                        <button
                          key={field.key}
                          type="button"
                          disabled={
                            field.fixed
                          }
                          onClick={() =>
                            toggleField(
                              field.key
                            )
                          }
                          className={[
                            "flex min-h-16 items-center justify-between rounded-2xl border p-4 text-right transition",

                            selected
                              ? "border-emerald-400 bg-emerald-50 text-emerald-950"
                              : "border-slate-200 bg-white text-slate-700",

                            field.fixed
                              ? "cursor-default"
                              : "hover:border-emerald-300",
                          ].join(" ")}
                        >
                          <div>
                            <p className="text-sm font-black">
                              {field.label}
                            </p>

                            {field.fixed ? (
                              <p className="mt-1 text-[11px] font-bold text-emerald-700">
                                ثابت دائمًا
                              </p>
                            ) : null}
                          </div>

                          {selected ? (
                            <Check className="h-5 w-5" />
                          ) : null}
                        </button>
                      );
                    }
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setPhase(
                        "performance"
                      )
                    }
                    className="h-12 rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-700"
                  >
                    السابق
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPhase("order")
                    }
                    className="h-12 rounded-2xl bg-sky-600 text-sm font-black text-white"
                  >
                    التالي: ترتيب الحقول
                  </button>
                </div>
              </div>
            ) : null}

            {phase ===
            "order" ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  {selectedFields.map(
                    (field, index) => (
                      <div
                        key={field.key}
                        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-xs font-black text-slate-500 shadow-sm">
                          {index + 1}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-slate-900">
                            {field.label}
                          </p>

                          {field.fixed ? (
                            <p className="mt-1 text-[11px] font-bold text-emerald-600">
                              ثابت في البداية
                            </p>
                          ) : null}
                        </div>

                        {!field.fixed ? (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                moveField(
                                  field.key,
                                  -1
                                )
                              }
                              className="grid h-9 w-9 place-items-center rounded-xl bg-white text-slate-600 shadow-sm"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                moveField(
                                  field.key,
                                  1
                                )
                              }
                              className="grid h-9 w-9 place-items-center rounded-xl bg-white text-slate-600 shadow-sm"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )
                  )}
                </div>

                <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                  <p className="text-xs font-black text-sky-700">
                    عنصر الأداء
                  </p>

                  <p className="mt-1 text-sm font-black text-sky-950">
                    {performanceElement}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setPhase("fields")
                    }
                    className="h-12 rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-700"
                  >
                    السابق
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={
                      createRuntime
                    }
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-black text-white disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}

                    إنشاء النموذج
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {showTemplateModal ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-950">
                  حفظ كقالب خاص
                </h3>

                <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                  يحفظ عنصر الأداء
                  والحقول والترتيب فقط،
                  ولا يحفظ قيم التقرير.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowTemplateModal(
                    false
                  )
                }
                className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <input
              value={templateName}
              onChange={(event) =>
                setTemplateName(
                  event.target.value
                )
              }
              placeholder="مثال: تقرير تنفيذ مبادرة"
              className="mt-5 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setShowTemplateModal(
                    false
                  )
                }
                className="h-11 rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-700"
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={
                  templateLoading
                }
                onClick={saveTemplate}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-sky-600 text-sm font-black text-white disabled:opacity-50"
              >
                {templateLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}

                حفظ القالب
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
