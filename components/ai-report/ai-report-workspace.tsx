"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PencilLine, Plus, Sparkles, Trash2, X } from "lucide-react";

import type { DynamicFormRendererSaveHandler } from "@/components/workflow/dynamic-form-renderer";
import { DynamicFormRenderer } from "@/components/workflow/dynamic-form-renderer";
import {
  buildAiReportInitialValues,
  buildAiReportRuntimeWorkflow,
  buildAiReportSubmissionValues,
  normalizeAiReportSchema,
  type AiReportSchema,
} from "@/lib/ai-report/ai-report-runtime-adapter";
import { sanitizeAiReportSchema } from "@/lib/ai-report/ai-report-text-sanitizer";
import type {
  CustomReportField,
  CustomReportFieldType,
  CustomReportOption,
} from "@/lib/custom-report/custom-report-types";

type ClarificationQuestion = {
  id: string;
  label: string;
  placeholder?: string;
  type: "text" | "textarea" | "select";
  options?: Array<{
    label: string;
    value: string;
  }>;
};

type AnalysisSnapshot = {
  confidence: number;
  reportIntent: string;
  reportFamily: string;
  reasoningSummary: string;
  missingContext: string[];
  coreFieldHints: string[];
};

type SuggestResponse = {
  success: boolean;
  error?: string;
  needsClarification?: boolean;
  confidence?: number;
  reportIntent?: string;
  reportFamily?: string;
  reasoningSummary?: string;
  missingContext?: string[];
  coreFieldHints?: string[];
  questions?: ClarificationQuestion[];
  schema?: AiReportSchema;
};

type SaveResult = {
  redirectTo?: string;
  error?: string;
};

type FieldOptionsResponse = {
  success: boolean;
  error?: string;
  options?: CustomReportOption[];
};

type FieldEditorDraft = {
  id: string;
  key: string;
  label: string;
  type: CustomReportFieldType;
  options: CustomReportOption[];
  isNew: boolean;
};

const LOADING_STATUSES = [
  "فهم الوصف",
  "مطابقة بنك القيم",
  "بناء النموذج",
] as const;

const SUGGEST_FOR_ME_VALUE = "اقترح لي";
const AI_REPORT_SECTION_TITLE = "بيانات التقرير المخصص";
const FIELD_EDITOR_TYPE_OPTIONS: Array<{
  value: "textarea" | "multi_select" | "date";
  label: string;
}> = [
  { value: "textarea", label: "نص" },
  { value: "multi_select", label: "خيار متعدد" },
  { value: "date", label: "تاريخ" },
];

function buildAnalysisSnapshot(data: SuggestResponse): AnalysisSnapshot {
  return {
    confidence:
      typeof data.confidence === "number" && Number.isFinite(data.confidence)
        ? data.confidence
        : 0.6,
    reportIntent: data.reportIntent || "تقرير مخصص",
    reportFamily: data.reportFamily || "تقرير تعليمي مخصص",
    reasoningSummary: data.reasoningSummary || "",
    missingContext: Array.isArray(data.missingContext) ? data.missingContext : [],
    coreFieldHints: Array.isArray(data.coreFieldHints) ? data.coreFieldHints : [],
  };
}

function buildClarificationAnswerState(
  questions: ClarificationQuestion[],
  previous: Record<string, string>,
) {
  return Object.fromEntries(
    questions.map((question) => [question.id, previous[question.id] || ""]),
  );
}

function buildClarificationSubmissionAnswers(
  questions: ClarificationQuestion[],
  answers: Record<string, string>,
) {
  return Object.fromEntries(
    questions.map((question) => {
      const answer = (answers[question.id] || "").trim();
      return [question.id, answer || SUGGEST_FOR_ME_VALUE];
    }),
  );
}

function createDraftId() {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeFieldLabel(label: string, fallback: string) {
  const nextLabel = label.trim();
  return nextLabel || fallback;
}

function normalizeFieldKeyCandidate(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildUniqueFieldKey(
  label: string,
  usedKeys: Set<string>,
  fallbackIndex: number,
) {
  const baseKey =
    normalizeFieldKeyCandidate(label) || `custom_field_${fallbackIndex + 1}`;
  let nextKey = baseKey;
  let suffix = 2;

  while (usedKeys.has(nextKey)) {
    nextKey = `${baseKey}_${suffix}`;
    suffix += 1;
  }

  usedKeys.add(nextKey);
  return nextKey;
}

function normalizeOptionValue(label: string, index: number) {
  const normalized = normalizeFieldKeyCandidate(label);
  return normalized || `option_${index + 1}`;
}

function dedupeOptions(options: CustomReportOption[]) {
  const seen = new Set<string>();

  return options.filter((option) => {
    const label = option.label.trim();
    const value = option.value.trim();

    if (!label || !value) {
      return false;
    }

    const dedupeKey = `${label.toLowerCase()}::${value.toLowerCase()}`;

    if (seen.has(dedupeKey)) {
      return false;
    }

    seen.add(dedupeKey);
    return true;
  });
}

function optionLinesToOptions(value: string) {
  return dedupeOptions(
    value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((label, index) => ({
        label,
        value: label === "أخرى" ? "other" : normalizeOptionValue(label, index),
      })),
  );
}

function optionsToLines(options: CustomReportOption[]) {
  return options.map((option) => option.label).join("\n");
}

function fieldTypeLabel(type: CustomReportFieldType) {
  switch (type) {
    case "text":
    case "textarea":
      return "نص";
    case "multi_select":
      return "خيار متعدد";
    case "date":
      return "تاريخ";
    case "select":
      return "قائمة اختيار";
    case "number":
      return "رقم";
    case "radio":
      return "اختيار واحد";
    case "checkbox":
      return "مربع اختيار";
    default:
      return "حقل";
  }
}

function buildFieldEditorDrafts(schema: AiReportSchema) {
  const fields = schema.sections[0]?.fields ?? [];

  return fields.map((field) => ({
    id: createDraftId(),
    key: field.key,
    label: field.label,
    type: field.type,
    options: dedupeOptions((field.options ?? []).map((option) => ({ ...option }))),
    isNew: false,
  }));
}

function buildSchemaFromEditorDrafts(
  schema: AiReportSchema,
  drafts: FieldEditorDraft[],
): AiReportSchema {
  const usedKeys = new Set<string>();
  const existingSection = schema.sections[0];
  const nextFields: CustomReportField[] = drafts.map((draft, index) => {
    const normalizedLabel = normalizeFieldLabel(draft.label, `حقل إضافي ${index + 1}`);
    const nextKey = draft.isNew
      ? buildUniqueFieldKey(normalizedLabel, usedKeys, index)
      : buildUniqueFieldKey(draft.key || normalizedLabel, usedKeys, index);
    const nextOptions =
      draft.type === "multi_select" ? dedupeOptions(draft.options).slice(0, 8) : [];

    return {
      key: nextKey,
      label: normalizedLabel,
      type: draft.type,
      required: false,
      placeholder:
        draft.type === "date"
          ? ""
          : draft.type === "text"
            ? `أدخل ${normalizedLabel}`
            : `اكتب ${normalizedLabel}`,
      helpText:
        draft.type === "multi_select"
          ? "يمكن اختيار أكثر من قيمة عند الحاجة."
          : "",
      reportLabel: normalizedLabel,
      showInReport: true,
      order: index + 1,
      options: nextOptions,
    };
  });

  return {
    ...schema,
    title: schema.title || AI_REPORT_SECTION_TITLE,
    sections: [
      {
        id: existingSection?.id || "ai_report_section_1",
        title: existingSection?.title || AI_REPORT_SECTION_TITLE,
        description: schema.description || existingSection?.description || undefined,
        order: 1,
        fields: nextFields,
      },
    ],
  };
}

function createNewDraftField(): FieldEditorDraft {
  return {
    id: createDraftId(),
    key: "",
    label: "",
    type: "textarea",
    options: [],
    isNew: true,
  };
}

export function AiReportWorkspace() {
  const router = useRouter();

  function goBackToAiReportHome() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/dashboard/ai-report");
  }

  const [prompt, setPrompt] = useState("");
  const [schema, setSchema] = useState<AiReportSchema | null>(null);
  const [savedTemplateId, setSavedTemplateId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [runtimeRevision, setRuntimeRevision] = useState(0);
  const [clarificationQuestions, setClarificationQuestions] = useState<
    ClarificationQuestion[]
  >([]);
  const [clarificationAnswers, setClarificationAnswers] = useState<
    Record<string, string>
  >({});
  const [previousAnalysis, setPreviousAnalysis] =
    useState<AnalysisSnapshot | null>(null);
  const [fieldEditorOpen, setFieldEditorOpen] = useState(false);
  const [fieldEditorDrafts, setFieldEditorDrafts] = useState<FieldEditorDraft[]>([]);
  const [fieldEditorError, setFieldEditorError] = useState("");
  const [suggestingFieldId, setSuggestingFieldId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      setSeconds(0);
      return;
    }

    setSeconds(1);

    const timer = window.setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [loading]);

  const runtimeWorkflow = useMemo(() => {
    return schema ? buildAiReportRuntimeWorkflow(schema) : null;
  }, [schema]);

  const initialValues = useMemo(() => {
    return schema ? buildAiReportInitialValues(schema) : undefined;
  }, [schema]);

  const loadingStatus =
    LOADING_STATUSES[
      Math.min(LOADING_STATUSES.length - 1, Math.floor(Math.max(seconds - 1, 0) / 2))
    ];
  const isClarificationStage = clarificationQuestions.length > 0;

  function resetClarificationStage() {
    setClarificationQuestions([]);
    setClarificationAnswers({});
    setPreviousAnalysis(null);
    setError("");
  }

  function openFieldEditor() {
    if (!schema) {
      return;
    }

    setFieldEditorDrafts(buildFieldEditorDrafts(normalizeAiReportSchema(schema)));
    setFieldEditorError("");
    setFieldEditorOpen(true);
  }

  function closeFieldEditor() {
    if (suggestingFieldId) {
      return;
    }

    setFieldEditorOpen(false);
    setFieldEditorDrafts([]);
    setFieldEditorError("");
  }

  function updateDraftField(
    draftId: string,
    patch: Partial<FieldEditorDraft>,
  ) {
    setFieldEditorDrafts((current) =>
      current.map((draft) => {
        if (draft.id !== draftId) {
          return draft;
        }

        const nextType = patch.type ?? draft.type;

        return {
          ...draft,
          ...patch,
          type: nextType,
          options: nextType === "multi_select" ? patch.options ?? draft.options : [],
        };
      }),
    );
  }

  function addDraftField() {
    setFieldEditorDrafts((current) => [...current, createNewDraftField()]);
  }

  function removeDraftField(draftId: string) {
    setFieldEditorDrafts((current) =>
      current.filter((draft) => draft.id !== draftId),
    );
  }

  async function suggestFieldOptions(draftId: string) {
    if (!schema) {
      return;
    }

    const draft = fieldEditorDrafts.find((item) => item.id === draftId);

    if (!draft) {
      return;
    }

    const fieldLabel = draft.label.trim();

    if (!fieldLabel) {
      setFieldEditorError("اكتب اسم الحقل أولًا قبل اقتراح الخيارات.");
      return;
    }

    setFieldEditorError("");
    setSuggestingFieldId(draftId);

    try {
      const response = await fetch("/api/dashboard/ai-report/field-options", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schema: buildSchemaFromEditorDrafts(schema, fieldEditorDrafts),
          fieldLabel,
          fieldType: "multi_select",
        }),
      });

      const data = (await response.json()) as FieldOptionsResponse;

      if (!response.ok || !data.success || !Array.isArray(data.options)) {
        throw new Error(data.error || "تعذر اقتراح خيارات هذا الحقل.");
      }

      updateDraftField(draftId, {
        options: dedupeOptions(data.options).slice(0, 8),
      });
    } catch (suggestError) {
      setFieldEditorError(
        suggestError instanceof Error
          ? suggestError.message
          : "تعذر اقتراح خيارات هذا الحقل.",
      );
    } finally {
      setSuggestingFieldId(null);
    }
  }

  function applyFieldEditorChanges() {
    if (!schema) {
      return;
    }

    if (!fieldEditorDrafts.length) {
      setFieldEditorError("أضف حقلًا واحدًا على الأقل قبل تطبيق التعديلات.");
      return;
    }

    const nextSchema = normalizeAiReportSchema(
      sanitizeAiReportSchema(buildSchemaFromEditorDrafts(schema, fieldEditorDrafts)),
    );

    setSchema(nextSchema);
    setRuntimeRevision((current) => current + 1);
    setFieldEditorError("");
    setFieldEditorOpen(false);
    setFieldEditorDrafts([]);
  }

  async function persistTemplateBestEffort(nextSchema: AiReportSchema) {
    try {
      const response = await fetch(
        savedTemplateId
          ? `/api/dashboard/custom-report/templates/${savedTemplateId}`
          : "/api/dashboard/custom-report/templates",
        {
          method: savedTemplateId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            savedTemplateId
              ? { schema: nextSchema }
              : {
                  prompt,
                  schema: nextSchema,
                  source: "AI",
                },
          ),
        },
      );

      if (!response.ok) {
        throw new Error("Template request failed");
      }

      const data = (await response.json().catch(() => null)) as
        | { template?: { id?: string } }
        | null;
      const templateId = data?.template?.id;

      if (templateId) {
        setSavedTemplateId(templateId);
      }
    } catch (templateError) {
      console.error("AI_REPORT_TEMPLATE_SAVE_FAILED", templateError);
    }
  }

  async function generateReport() {
    const trimmedPrompt = prompt.trim();

    if (trimmedPrompt.length < 3) {
      setError("اكتب وصفًا مختصرًا للتقرير حتى يتمكن النظام من مساعدتك.");
      return;
    }

    if (loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const nextClarificationAnswers = isClarificationStage
        ? buildClarificationSubmissionAnswers(
            clarificationQuestions,
            clarificationAnswers,
          )
        : undefined;

      const response = await fetch("/api/dashboard/ai-report/suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          clarificationAnswers: nextClarificationAnswers,
          previousAnalysis,
        }),
      });

      const data = (await response.json()) as SuggestResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر توليد التقرير المخصص.");
      }

      const nextAnalysis = buildAnalysisSnapshot(data);
      setPreviousAnalysis(nextAnalysis);

      if (data.needsClarification) {
        const nextQuestions = Array.isArray(data.questions) ? data.questions : [];

        if (!nextQuestions.length) {
          throw new Error("نحتاج وصفًا أوضح قليلًا حتى نتمكن من بناء الحقول المناسبة.");
        }

        setClarificationQuestions(nextQuestions);
        setClarificationAnswers((current) =>
          buildClarificationAnswerState(nextQuestions, current),
        );
        return;
      }

      if (!data.schema) {
        throw new Error("تعذر تجهيز نموذج التقرير المخصص.");
      }

      setSchema(normalizeAiReportSchema(sanitizeAiReportSchema(data.schema)));
      setSavedTemplateId(null);
      setRuntimeRevision((current) => current + 1);
      setClarificationQuestions([]);
      setClarificationAnswers({});
      setModalOpen(false);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "تعذر توليد التقرير المخصص.",
      );
    } finally {
      setLoading(false);
    }
  }

  const handleSave: DynamicFormRendererSaveHandler = async ({
    type,
    values,
  }) => {
    if (!schema) {
      throw new Error("ولّد التقرير أولًا قبل الحفظ.");
    }

    const normalizedSchema = normalizeAiReportSchema(
      sanitizeAiReportSchema(schema),
    );

    const response = await fetch("/api/dashboard/custom-report/entries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        schema: normalizedSchema,
        values: buildAiReportSubmissionValues(normalizedSchema, values),
        status: type === "submit" ? "SUBMITTED" : "DRAFT",
      }),
    });

    const data = (await response.json()) as SaveResult;

    if (!response.ok || !data.redirectTo) {
      throw new Error(data.error || "تعذر حفظ التقرير.");
    }

    setSchema(normalizedSchema);
    await persistTemplateBestEffort(normalizedSchema);

    return {
      redirectTo: data.redirectTo,
      feedbackTitle: type === "submit" ? "تم إرسال التقرير" : "تم حفظ المسودة",
      feedbackMessage:
        type === "submit"
          ? "تم حفظ التقرير وإرساله بنجاح."
          : "تم حفظ التقرير كمسودة بنجاح.",
    };
  };

  return (
    <main className="space-y-6" dir="rtl">
      {modalOpen ? (
        <AiReportPromptModal
          prompt={prompt}
          loading={loading}
          seconds={seconds}
          loadingStatus={loadingStatus}
          error={error}
          clarificationQuestions={clarificationQuestions}
          clarificationAnswers={clarificationAnswers}
          previousAnalysis={previousAnalysis}
          onPromptChange={setPrompt}
          onClarificationAnswerChange={(questionId, value) => {
            setClarificationAnswers((current) => ({
              ...current,
              [questionId]: value,
            }));
          }}
          onBackToPrompt={resetClarificationStage}
          onGenerate={generateReport}
          onExit={goBackToAiReportHome}
        />
      ) : null}

      {fieldEditorOpen && schema ? (
        <AiReportFieldEditorModal
          drafts={fieldEditorDrafts}
          error={fieldEditorError}
          suggestingFieldId={suggestingFieldId}
          onClose={closeFieldEditor}
          onLabelChange={(draftId, value) =>
            updateDraftField(draftId, { label: value })
          }
          onTypeChange={(draftId, value) =>
            updateDraftField(draftId, {
              type: value,
              options: value === "multi_select" ? [] : [],
            })
          }
          onOptionsChange={(draftId, value) =>
            updateDraftField(draftId, { options: optionLinesToOptions(value) })
          }
          onDelete={removeDraftField}
          onAddField={addDraftField}
          onSuggestOptions={suggestFieldOptions}
          onApply={applyFieldEditorChanges}
        />
      ) : null}

      {runtimeWorkflow && schema && initialValues ? (
        <>
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black text-sky-700">قبل الحفظ أو الإرسال</p>
                <h1 className="mt-1 text-2xl font-black text-slate-950">
                  راجع الحقول أو عدّلها عند الحاجة
                </h1>
                <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                  التعديل هنا يغيّر مخطط التقرير فقط، بينما يبقى النموذج النهائي هو
                  نفس واجهة Workflow الرسمية.
                </p>
              </div>

              <button
                type="button"
                onClick={openFieldEditor}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-100"
              >
                <PencilLine className="h-4 w-4" />
                تعديل الحقول
              </button>
            </div>
          </section>

          <DynamicFormRenderer
            key={`ai-report-runtime-${runtimeRevision}`}
            workflow={runtimeWorkflow}
            serviceId="custom-report"
            requiresStudent={false}
            title={schema.title}
            initialValues={initialValues}
            onSave={handleSave}
          />
        </>
      ) : (
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
            <Sparkles className="h-8 w-8" />
          </div>

          <h1 className="mt-5 text-3xl font-black text-slate-950">
            ابدأ بوصف التقرير المطلوب
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm font-bold leading-7 text-slate-500">
            بعد توليد النموذج سيظهر لك نفس Workflow الرسمي المستخدم في خدمات تقييم
            الأداء، مع خطوة واحدة فقط وواجهة الإدخال المعتادة.
          </p>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800"
          >
            <Sparkles className="h-4 w-4" />
            إنشاء حقول التقرير
          </button>
        </section>
      )}
    </main>
  );
}

function AiReportPromptModal({
  prompt,
  loading,
  seconds,
  loadingStatus,
  error,
  clarificationQuestions,
  clarificationAnswers,
  previousAnalysis,
  onPromptChange,
  onClarificationAnswerChange,
  onBackToPrompt,
  onGenerate,
  onExit,
}: {
  prompt: string;
  loading: boolean;
  seconds: number;
  loadingStatus: string;
  error: string;
  clarificationQuestions: ClarificationQuestion[];
  clarificationAnswers: Record<string, string>;
  previousAnalysis: AnalysisSnapshot | null;
  onPromptChange: (value: string) => void;
  onClarificationAnswerChange: (questionId: string, value: string) => void;
  onBackToPrompt: () => void;
  onGenerate: () => void;
  onExit: () => void;
}) {
  const isClarificationStage = clarificationQuestions.length > 0;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      dir="rtl"
    >
      <section className="w-full max-w-3xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-black tracking-[0.18em] text-sky-100">
                AI REPORT WORKFLOW
              </p>

              <h2 className="text-3xl font-black">
                {isClarificationStage
                  ? "نحتاج توضيح بسيط"
                  : "صف التقرير الذي تريد إنشاءه"}
              </h2>

              <p className="max-w-2xl text-sm font-bold leading-7 text-sky-50">
                {isClarificationStage
                  ? "سنستخدم هذا التوضيح لبناء حقول أقرب لطبيعة التقرير داخل الواجهة الرسمية."
                  : "اكتب وصفًا عمليًا للتقرير، وسيقوم المساعد ببناء نموذج مناسب من خلال بنك المعرفة ثم عرضه داخل Workflow الرسمي."}
              </p>
            </div>

            <button
              type="button"
              onClick={onExit}
              disabled={loading}
              className="rounded-full bg-white/10 p-2 text-white ring-1 ring-white/10 transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {loading ? (
            <div className="rounded-[2rem] border border-sky-100 bg-sky-50/70 p-6">
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <div className="grid h-28 w-28 place-items-center rounded-full border border-sky-200 bg-white text-sky-700 shadow-sm">
                  <div>
                    <p className="text-4xl font-black">{seconds}</p>
                    <p className="text-[11px] font-black text-sky-500">ثانية</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-sky-700 ring-1 ring-sky-100">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري التجهيز
                  </div>

                  <p className="text-sm font-black text-slate-900">{loadingStatus}</p>
                  <p className="text-xs font-bold text-slate-500">
                    نفهم الطلب ونطابقه مع بنك القيم قبل بناء النموذج.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {!isClarificationStage ? (
            <div className="space-y-3">
              <label className="text-sm font-black text-slate-900">
                وصف التقرير
              </label>

              <textarea
                value={prompt}
                onChange={(event) => onPromptChange(event.target.value)}
                rows={6}
                placeholder="مثال: أريد تقريرًا عن نتائج نهاية الوحدة يتضمن مستوى الإتقان، أبرز الفجوات، الإجراءات المنفذة، والتوصيات العلاجية."
                className="w-full rounded-[1.75rem] border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-slate-400">الوصف الحالي</p>
                    <p className="mt-2 text-sm font-bold leading-7 text-slate-700">
                      {prompt}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onBackToPrompt}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100"
                  >
                    تعديل الوصف
                  </button>
                </div>

                {previousAnalysis ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
                      {previousAnalysis.reportFamily}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                      ثقة {Math.round(previousAnalysis.confidence * 100)}%
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4">
                {clarificationQuestions.map((question) => (
                  <ClarificationField
                    key={question.id}
                    question={question}
                    value={clarificationAnswers[question.id] || ""}
                    onChange={(value) =>
                      onClarificationAnswerChange(question.id, value)
                    }
                  />
                ))}
              </div>

              <p className="text-xs font-bold text-slate-400">
                الإجابات اختيارية. اترك أي خانة فارغة وسيقترحها النظام.
              </p>
            </div>
          )}

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-bold text-slate-400">
              {isClarificationStage
                ? "التوضيح المختصر يكفي. لا حاجة لشرح طويل."
                : "اكتب الهدف الطبيعي للتقرير، وسيتكفل النظام باقتراح الحقول الأقرب له."}
            </p>

            <button
              type="button"
              onClick={onGenerate}
              disabled={loading}
              className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {loading
                ? "جاري التجهيز"
                : isClarificationStage
                  ? "متابعة إنشاء الحقول"
                  : "إنشاء حقول التقرير"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ClarificationField({
  question,
  value,
  onChange,
}: {
  question: ClarificationQuestion;
  value: string;
  onChange: (value: string) => void;
}) {
  if (question.type === "textarea") {
    return (
      <label className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-black text-slate-900">{question.label}</span>
          <button
            type="button"
            onClick={() => onChange(SUGGEST_FOR_ME_VALUE)}
            className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-black text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-100"
          >
            اقترح لي
          </button>
        </div>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          placeholder={question.placeholder}
          className="w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
        />
      </label>
    );
  }

  if (question.type === "select" && question.options?.length) {
    return (
      <label className="space-y-2">
        <span className="text-sm font-black text-slate-900">{question.label}</span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
        >
          <option value="">اختر</option>
          {question.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-black text-slate-900">{question.label}</span>
        <button
          type="button"
          onClick={() => onChange(SUGGEST_FOR_ME_VALUE)}
          className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-black text-sky-700 ring-1 ring-sky-100 transition hover:bg-sky-100"
        >
          اقترح لي
        </button>
      </div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={question.placeholder}
        className="w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
      />
    </label>
  );
}

function AiReportFieldEditorModal({
  drafts,
  error,
  suggestingFieldId,
  onClose,
  onLabelChange,
  onTypeChange,
  onOptionsChange,
  onDelete,
  onAddField,
  onSuggestOptions,
  onApply,
}: {
  drafts: FieldEditorDraft[];
  error: string;
  suggestingFieldId: string | null;
  onClose: () => void;
  onLabelChange: (draftId: string, value: string) => void;
  onTypeChange: (draftId: string, value: "textarea" | "multi_select" | "date") => void;
  onOptionsChange: (draftId: string, value: string) => void;
  onDelete: (draftId: string) => void;
  onAddField: () => void;
  onSuggestOptions: (draftId: string) => void;
  onApply: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      dir="rtl"
    >
      <section className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[0.16em] text-sky-700">
                FIELD EDITOR
              </p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">
                تعديل الحقول
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-bold leading-7 text-slate-500">
                يمكنك إعادة تسمية الحقول، حذف ما لا تحتاجه، أو إضافة حقل جديد قبل
                الحفظ. الشواهد تبقى مدعومة من Workflow الرسمي وليست حقلًا عاديًا.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={Boolean(suggestingFieldId)}
              className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="إغلاق محرر الحقول"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {drafts.map((draft) => {
            const isSuggesting = suggestingFieldId === draft.id;

            return (
              <article
                key={draft.id}
                className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <label className="block">
                      <span className="text-sm font-black text-slate-900">
                        اسم الحقل
                      </span>
                      <input
                        value={draft.label}
                        onChange={(event) =>
                          onLabelChange(draft.id, event.target.value)
                        }
                        placeholder="مثال: مؤشرات تحقق الهدف"
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      />
                    </label>

                    {draft.isNew ? (
                      <label className="block">
                        <span className="text-sm font-black text-slate-900">
                          نوع الحقل
                        </span>
                        <select
                          value={draft.type}
                          onChange={(event) =>
                            onTypeChange(
                              draft.id,
                              event.target.value as "textarea" | "multi_select" | "date",
                            )
                          }
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                        >
                          {FIELD_EDITOR_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <div className="inline-flex w-fit items-center rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                        {fieldTypeLabel(draft.type)}
                      </div>
                    )}

                    {draft.type === "multi_select" ? (
                      <div className="space-y-3">
                        <label className="block">
                          <span className="text-sm font-black text-slate-900">
                            خيارات الحقل
                          </span>
                          <textarea
                            value={optionsToLines(draft.options)}
                            onChange={(event) =>
                              onOptionsChange(draft.id, event.target.value)
                            }
                            rows={5}
                            placeholder="اكتب كل خيار في سطر مستقل"
                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                          />
                        </label>

                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => onSuggestOptions(draft.id)}
                            disabled={isSuggesting}
                            className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-black text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSuggesting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkles className="h-4 w-4" />
                            )}
                            اقترح خيارات
                          </button>

                          <p className="text-xs font-bold text-slate-400">
                            عند الاقتراح سيعيد النظام 4 إلى 8 خيارات قابلة للتعديل.
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => onDelete(draft.id)}
                    className="inline-flex items-center gap-2 self-start rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-black text-rose-700 transition hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    حذف
                  </button>
                </div>
              </article>
            );
          })}

          <button
            type="button"
            onClick={onAddField}
            className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            إضافة حقل جديد
          </button>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold text-slate-400">
            بعد تطبيق التعديلات سيُعاد تحميل النموذج الرسمي بالحقول الجديدة.
          </p>

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={Boolean(suggestingFieldId)}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={onApply}
              className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              تطبيق التعديلات
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
