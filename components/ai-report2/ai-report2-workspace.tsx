"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";

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
import {
  TEACHER_PERFORMANCE_ELEMENT_OPTIONS,
  type TeacherPerformanceElementScope,
} from "@/lib/ai-report2/teacher-performance-elements";

type AiReport2SelectedReport = {
  reportSlug: string;
  reportName: string;
  reason?: string;
  confidence?: number;
};

type ClarificationQuestionType = "single_select" | "multi_select" | "text";

type ClarificationQuestion = {
  id: string;
  label: string;
  type: ClarificationQuestionType;
  required: boolean;
  helpText?: string;
  options?: Array<{
    label: string;
    value: string;
  }>;
};

type ClarificationAnswer = {
  id: string;
  question: string;
  type: ClarificationQuestionType;
  value: string | string[];
};

type AiReport2ClarifyResponse = {
  success: boolean;
  error?: string;
  teacherIntent?: string;
  performanceElement?: string;
  questions?: ClarificationQuestion[];
};

type AiReport2SuggestResponse = {
  success: boolean;
  error?: string;
  confidence?: number;
  reportIntent?: string;
  reasoningSummary?: string;
  selectedReports?: AiReport2SelectedReport[];
  bankValuesUsed?: number;
  customValuesUsed?: number;
  teacherIntent?: string;
  performanceElement?: string;
  performanceElementScope?: string;
  satisfactionScore?: number;
  clarificationAnswersApplied?: number;
  teacherIntentAnalysis?: {
    action?: string;
    audience?: string;
    purpose?: string;
    selectedPerformanceElementLabel?: string;
    resolvedPerformanceElementLabel?: string;
  };
  schema?: AiReportSchema;
};

type SaveResult = {
  redirectTo?: string;
  error?: string;
};

type ClarificationAnswerState = Record<string, string | string[]>;

const EXAMPLE_PROMPTS = [
  "تقرير عن تنوع استراتيجيات التدريس في درس تطبيقي.",
  "تقرير عن تحليل نتائج المتعلمين في نهاية وحدة وبناء إجراءات علاجية.",
  "تقرير عن استخدام التقنية في التعلم وقياس أثرها داخل الحصة.",
];

function formatPercent(value: unknown) {
  const number = typeof value === "number" && Number.isFinite(value) ? value : 0.65;
  return `${Math.round(Math.max(0, Math.min(1, number)) * 100)}%`;
}

function hasAnswer(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return Boolean(value?.trim());
}

export function AiReport2Workspace() {
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [schema, setSchema] = useState<AiReportSchema | null>(null);
  const [modalOpen, setModalOpen] = useState(true);
  const [modalStep, setModalStep] = useState<"prompt" | "clarify">("prompt");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [performanceElementScope, setPerformanceElementScope] =
    useState<TeacherPerformanceElementScope>("auto");
  const [clarificationQuestions, setClarificationQuestions] = useState<
    ClarificationQuestion[]
  >([]);
  const [clarificationAnswers, setClarificationAnswers] =
    useState<ClarificationAnswerState>({});

  const [analysis, setAnalysis] = useState<{
    confidence: number;
    reportIntent: string;
    reasoningSummary: string;
    selectedReports: AiReport2SelectedReport[];
    bankValuesUsed: number;
    customValuesUsed: number;
    teacherIntent: string;
    performanceElement: string;
    satisfactionScore: number | null;
    clarificationAnswersApplied: number;
  } | null>(null);

  const runtimeWorkflow = useMemo(() => {
    return schema ? buildAiReportRuntimeWorkflow(schema) : null;
  }, [schema]);

  const initialValues = useMemo(() => {
    return schema ? buildAiReportInitialValues(schema) : undefined;
  }, [schema]);

  function updateClarificationAnswer(
    question: ClarificationQuestion,
    value: string,
  ) {
    setClarificationAnswers((current) => {
      if (question.type === "multi_select") {
        const currentValues = Array.isArray(current[question.id])
          ? (current[question.id] as string[])
          : [];

        const exists = currentValues.includes(value);
        const nextValues = exists
          ? currentValues.filter((item) => item !== value)
          : [...currentValues, value];

        return {
          ...current,
          [question.id]: nextValues,
        };
      }

      return {
        ...current,
        [question.id]: value,
      };
    });
  }

  function buildClarificationAnswersPayload(): ClarificationAnswer[] {
    return clarificationQuestions
      .map<ClarificationAnswer | null>((question) => {
        const value = clarificationAnswers[question.id];

        if (!hasAnswer(value)) {
          return null;
        }

        return {
          id: question.id,
          question: question.label,
          type: question.type,
          value: value || "",
        };
      })
      .filter((item): item is ClarificationAnswer => item !== null);
  }

  async function requestClarification() {
    const trimmedPrompt = prompt.trim();

    if (trimmedPrompt.length < 3) {
      setError("اكتب وصفًا مختصرًا للتقرير المطلوب.");
      return;
    }

    if (loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/dashboard/ai-report2/clarify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          performanceElementScope,
        }),
      });

      const data = (await response.json()) as AiReport2ClarifyResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر فهم التقرير.");
      }

      const questions = Array.isArray(data.questions) ? data.questions : [];

      if (!questions.length) {
        await generateReport([]);
        return;
      }

      setClarificationQuestions(questions);
      setClarificationAnswers({});
      setModalStep("clarify");
    } catch (clarifyError) {
      setError(
        clarifyError instanceof Error
          ? clarifyError.message
          : "تعذر فهم التقرير.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function generateReport(
    answers: ClarificationAnswer[] = buildClarificationAnswersPayload(),
  ) {
    const trimmedPrompt = prompt.trim();

    if (trimmedPrompt.length < 3) {
      setError("اكتب وصفًا مختصرًا للتقرير المطلوب.");
      return;
    }

    if (loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/dashboard/ai-report2/suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          performanceElementScope,
          clarificationAnswers: answers,
        }),
      });

      const data = (await response.json()) as AiReport2SuggestResponse;

      if (!response.ok || !data.success || !data.schema) {
        throw new Error(data.error || "تعذر إنشاء التقرير التجريبي.");
      }

      const nextSchema = normalizeAiReportSchema(
        sanitizeAiReportSchema(data.schema),
      );

      setSchema(nextSchema);
      setAnalysis({
        confidence:
          typeof data.confidence === "number" && Number.isFinite(data.confidence)
            ? data.confidence
            : 0.65,
        reportIntent: data.reportIntent || "تقرير تقييم أداء المعلم",
        reasoningSummary:
          data.reasoningSummary ||
          "تم بناء النموذج من بنك قيم تقييم أداء المعلم مع سماح محدود بقيم مخصصة.",
        selectedReports: Array.isArray(data.selectedReports)
          ? data.selectedReports
          : [],
        bankValuesUsed:
          typeof data.bankValuesUsed === "number" ? data.bankValuesUsed : 0,
        customValuesUsed:
          typeof data.customValuesUsed === "number" ? data.customValuesUsed : 0,
        teacherIntent: data.teacherIntent || "نية معلم عامة",
        performanceElement:
          data.performanceElement ||
          data.teacherIntentAnalysis?.resolvedPerformanceElementLabel ||
          "يحدد تلقائيًا",
        satisfactionScore:
          typeof data.satisfactionScore === "number" ? data.satisfactionScore : null,
        clarificationAnswersApplied:
          typeof data.clarificationAnswersApplied === "number"
            ? data.clarificationAnswersApplied
            : answers.length,
      });
      setModalOpen(false);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "تعذر إنشاء التقرير التجريبي.",
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

    return {
      redirectTo: data.redirectTo,
      feedbackTitle: type === "submit" ? "تم إرسال التقرير" : "تم حفظ المسودة",
      feedbackMessage:
        type === "submit"
          ? "تم حفظ التقرير التجريبي وإرساله بنجاح."
          : "تم حفظ التقرير التجريبي كمسودة بنجاح.",
    };
  };

  return (
    <main className="space-y-6" dir="rtl">
      {modalOpen ? (
        <AiReport2PromptModal
          prompt={prompt}
          performanceElementScope={performanceElementScope}
          loading={loading}
          error={error}
          step={modalStep}
          clarificationQuestions={clarificationQuestions}
          clarificationAnswers={clarificationAnswers}
          onPromptChange={setPrompt}
          onPerformanceElementScopeChange={setPerformanceElementScope}
          onRequestClarification={requestClarification}
          onGenerate={() => generateReport()}
          onSkipClarification={() => generateReport([])}
          onBackToPrompt={() => setModalStep("prompt")}
          onClarificationAnswerChange={updateClarificationAnswer}
          onExit={() => router.push("/dashboard/teacher/ai-report2")}
        />
      ) : null}

      {runtimeWorkflow && schema && initialValues ? (
        <>
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
              <div>
                <p className="text-xs font-black text-sky-700">
                  AI Report 2 · نموذج تجريبي
                </p>

                <h1 className="mt-1 text-2xl font-black text-slate-950">
                  {schema.title || "تقرير ذكي تجريبي"}
                </h1>

                <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                  النموذج الناتج مقنن وغير إلزامي، وعدد الحقول لا يتجاوز 7 خانات.
                </p>
              </div>

              {analysis ? (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm ring-1 ring-slate-100">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                      ثقة {formatPercent(analysis.confidence)}
                    </span>
                    {analysis.performanceElement ? (
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-100">
                        عنصر الأداء: {analysis.performanceElement}
                      </span>
                    ) : null}

                    {typeof analysis.satisfactionScore === "number" ? (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                        ملاءمة {analysis.satisfactionScore}%
                      </span>
                    ) : null}

                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
                      من البنك: {analysis.bankValuesUsed}
                    </span>
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 ring-1 ring-violet-100">
                      مخصص: {analysis.customValuesUsed}
                    </span>
                    <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700 ring-1 ring-cyan-100">
                      إجابات التوضيح: {analysis.clarificationAnswersApplied}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            {analysis ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-[1.5rem] bg-slate-50 p-4 ring-1 ring-slate-100">
                  <p className="text-xs font-black text-slate-400">فهم النموذج</p>
                  <p className="mt-2 text-sm font-bold leading-7 text-slate-700">
                    {analysis.reasoningSummary}
                  </p>
                </div>

                <div className="rounded-[1.5rem] bg-slate-50 p-4 ring-1 ring-slate-100">
                  <p className="text-xs font-black text-slate-400">
                    التقارير الأقرب
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {analysis.selectedReports.length ? (
                      analysis.selectedReports.slice(0, 4).map((item) => (
                        <span
                          key={`${item.reportSlug}-${item.reportName}`}
                          className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-100"
                        >
                          {item.reportName}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm font-bold text-slate-500">
                        لم يرجع النموذج تقريرًا محددًا، وتم بناء نموذج عام.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <DynamicFormRenderer
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
            <BrainCircuit className="h-8 w-8" />
          </div>

          <h1 className="mt-5 text-3xl font-black text-slate-950">
            ابدأ بوصف التقرير التجريبي
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm font-bold leading-7 text-slate-500">
            سيقود DeepSeek عملية الفهم، ثم يسألك سؤالين إلى أربعة أسئلة لتضييق النية قبل بناء النموذج النهائي.
          </p>

          <button
            type="button"
            onClick={() => {
              setModalOpen(true);
              setModalStep("prompt");
            }}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800"
          >
            <Sparkles className="h-4 w-4" />
            إنشاء تقرير تجريبي
          </button>
        </section>
      )}
    </main>
  );
}

function AiReport2PromptModal({
  prompt,
  performanceElementScope,
  loading,
  error,
  step,
  clarificationQuestions,
  clarificationAnswers,
  onPromptChange,
  onPerformanceElementScopeChange,
  onRequestClarification,
  onGenerate,
  onSkipClarification,
  onBackToPrompt,
  onClarificationAnswerChange,
  onExit,
}: {
  prompt: string;
  performanceElementScope: TeacherPerformanceElementScope;
  loading: boolean;
  error: string;
  step: "prompt" | "clarify";
  clarificationQuestions: ClarificationQuestion[];
  clarificationAnswers: ClarificationAnswerState;
  onPromptChange: (value: string) => void;
  onPerformanceElementScopeChange: (value: TeacherPerformanceElementScope) => void;
  onRequestClarification: () => void;
  onGenerate: () => void;
  onSkipClarification: () => void;
  onBackToPrompt: () => void;
  onClarificationAnswerChange: (
    question: ClarificationQuestion,
    value: string,
  ) => void;
  onExit: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      dir="rtl"
    >
      <section className="w-full max-w-3xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[0.18em] text-sky-100">
                DEEPSEEK-LED REPORT BUILDER
              </p>

              <h2 className="mt-2 text-3xl font-black">
                {step === "prompt"
                  ? "صف التقرير الذي في بالك"
                  : "ساعدنا بسؤالين لتقريب النموذج"}
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-sky-50">
                {step === "prompt"
                  ? "اكتب وصفًا طبيعيًا. بعدها سيطرح النظام أسئلة قصيرة لتضييق نية التقرير قبل توليد النموذج."
                  : "الإجابات اختيارية، لكنها تساعد على تضييق القيم والحقول وتقليل التوسع."}
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

        {step === "prompt" ? (
          <div className="space-y-5 p-6">
            <div className="space-y-3">
              <label className="text-sm font-black text-slate-900">
                وصف التقرير
              </label>

              <textarea
                value={prompt}
                onChange={(event) => onPromptChange(event.target.value)}
                rows={6}
                placeholder="مثال: أريد تقريرًا عن استخدام بطاقة خروج لقياس فهم الطلاب في نهاية الدرس."
                className="w-full rounded-[1.75rem] border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
            </div>

            <div className="grid gap-2">
              {EXAMPLE_PROMPTS.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => onPromptChange(example)}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right text-xs font-black text-slate-600 transition hover:bg-white hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-600" />
                  {example}
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <label
                htmlFor="ai-report2-performance-scope"
                className="text-sm font-black text-slate-800"
              >
                اختر عنصر الأداء قبل الإرسال
              </label>

              <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                هذا الاختيار يضيّق فهم DeepSeek ويجعل القيم أقرب لنية المعلم.
              </p>

              <select
                id="ai-report2-performance-scope"
                value={performanceElementScope}
                onChange={(event) =>
                  onPerformanceElementScopeChange(
                    event.target.value as TeacherPerformanceElementScope,
                  )
                }
                disabled={loading}
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {TEACHER_PERFORMANCE_ELEMENT_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={onExit}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ArrowRight className="h-4 w-4" />
                رجوع
              </button>

              <button
                type="button"
                onClick={onRequestClarification}
                disabled={loading}
                className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {loading ? "جاري الفهم" : "فهم التقرير"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 p-6">
            <div className="grid gap-4">
              {clarificationQuestions.map((question, index) => (
                <div
                  key={question.id}
                  className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-xs font-black text-sky-700">
                    سؤال {index + 1}
                  </p>

                  <h3 className="mt-1 text-sm font-black text-slate-900">
                    {question.label}
                  </h3>

                  {question.helpText ? (
                    <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                      {question.helpText}
                    </p>
                  ) : null}

                  {question.type === "text" ? (
                    <input
                      value={
                        typeof clarificationAnswers[question.id] === "string"
                          ? (clarificationAnswers[question.id] as string)
                          : ""
                      }
                      onChange={(event) =>
                        onClarificationAnswerChange(question, event.target.value)
                      }
                      placeholder="اكتب إجابة قصيرة"
                      className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    />
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(question.options || []).map((option) => {
                        const value = clarificationAnswers[question.id];
                        const active = Array.isArray(value)
                          ? value.includes(option.label)
                          : value === option.label;

                        return (
                          <button
                            key={`${question.id}-${option.value}-${option.label}`}
                            type="button"
                            onClick={() =>
                              onClarificationAnswerChange(question, option.label)
                            }
                            className={
                              active
                                ? "rounded-full bg-sky-700 px-4 py-2 text-xs font-black text-white shadow-sm"
                                : "rounded-full bg-white px-4 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200 transition hover:text-sky-700 hover:ring-sky-200"
                            }
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={onBackToPrompt}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ArrowRight className="h-4 w-4" />
                تعديل الوصف
              </button>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={onSkipClarification}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  تخطي الأسئلة
                </button>

                <button
                  type="button"
                  onClick={onGenerate}
                  disabled={loading}
                  className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {loading ? "جاري البناء" : "توليد النموذج"}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}