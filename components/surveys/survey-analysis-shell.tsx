"use client";

import { Capacitor } from "@capacitor/core";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Link2, BarChart3, CheckCircle2, ListChecks, MessageCircle } from "lucide-react";
import Link from "next/link";
import { BrandLoader } from "@/components/common/brand-loader";
import { PrintExportPopCard } from "@/components/print-export/print-export-pop-card";
import { usePrintExportAction } from "@/components/print-export/use-print-export-action";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { surveyAudienceLabels } from "@/lib/surveys/survey-config";
import { downloadUrlAsFile } from "@/lib/print-export/print-export-download";

type OptionCount = {
  label: string;
  count: number;
  percentage: number;
};

type TextSample = {
  id: string;
  value: string;
  submittedAt: string;
};

type AnalysisQuestion = {
  id: string;
  label: string;
  type: string;
  isRequired: boolean;
  totalResponses: number;
  answeredCount: number;
  emptyCount: number;
  answerRate: number;
  average: number | null;
  min: number | null;
  max: number | null;
  optionCounts: OptionCount[];
  textSamples: TextSample[];
};

type SurveyAnalysis = {
  survey: {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    token: string;
    audienceType: string;
    isAnonymous: boolean;
    publishedAt?: string | null;
  };
  totals: {
    questions: number;
    responses: number;
    completedRequiredResponses: number;
    completionRate: number;
  };
  questions: AnalysisQuestion[];
};

type SurveyAnalysisShellProps = {
  surveyId: string;
  boardPath: string;
};

const chartColors = ["#0284c7", "#059669", "#f59e0b", "#e11d48", "#7c3aed", "#0f172a", "#0891b2"];

function statusLabel(status: string) {
  if (status === "DRAFT") return "مسودة";
  if (status === "PUBLISHED") return "منشور";
  if (status === "CLOSED") return "مغلق";
  if (status === "ARCHIVED") return "مؤرشف";
  return status;
}

function questionTypeLabel(type: string) {
  if (type === "TEXT") return "إجابة قصيرة";
  if (type === "TEXTAREA") return "إجابة طويلة";
  if (type === "SINGLE_CHOICE") return "اختيار واحد";
  if (type === "MULTIPLE_CHOICE") return "اختيارات متعددة";
  if (type === "YES_NO") return "نعم / لا";
  if (type === "RATING") return "تقييم";
  if (type === "SCALE") return "مقياس رقمي";
  if (type === "NUMBER") return "رقم";
  if (type === "DATE") return "تاريخ";
  return type;
}

function isChoiceQuestion(type: string) {
  return type === "YES_NO" || type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE";
}

function isNumericQuestion(type: string) {
  return type === "RATING" || type === "SCALE" || type === "NUMBER";
}

function SurveyMetricCard({
  label,
  value,
  icon: Icon,
  valueClassName = "text-slate-950",
}: {
  label: string;
  value: number | string;
  icon: typeof MessageCircle;
  valueClassName?: string;
}) {
  return (
    <article className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[8px] font-black leading-4 text-slate-400">{label}</p>
          <p className={["mt-2 text-[28px] font-black leading-tight", valueClassName].join(" ")}>
            {value}
          </p>
        </div>

        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-50 text-cyan-600">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </article>
  );
}
export function SurveyAnalysisShell({ surveyId, boardPath }: SurveyAnalysisShellProps) {
  const [analysis, setAnalysis] = useState<SurveyAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedReportQuestionIds, setSelectedReportQuestionIds] = useState<string[]>([]);
  const {
    status: printExportStatus,
    modal: printExportModal,
    runPrintExport,
    openFallbackPrintUrl,
    closeModal,
  } = usePrintExportAction();

  const numericQuestions = useMemo(
    () => analysis?.questions.filter((question) => question.average !== null) || [],
    [analysis],
  );

  const choiceQuestions = useMemo(
    () =>
      analysis?.questions.filter(
        (question) => isChoiceQuestion(question.type) && question.optionCounts.some((option) => option.count > 0),
      ) || [],
    [analysis],
  );

  async function loadAnalysis() {
    setIsLoading(true);
    setError(null);

    const response = await fetch(`/api/dashboard/surveys/${surveyId}/analysis`, {
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    setIsLoading(false);

    if (!response.ok) {
      setError(data?.error || "تعذر تحميل تحليل الاستبيان.");
      return;
    }

    setAnalysis(data);
  }

  useEffect(() => {
    loadAnalysis();
  }, [surveyId]);

  useEffect(() => {
    if (!analysis?.questions.length) return;

    setSelectedReportQuestionIds((previous) => {
      const validIds = new Set(analysis.questions.map((question) => question.id));
      const keptIds = previous.filter((questionId) => validIds.has(questionId));

      if (keptIds.length) {
        return keptIds;
      }

      return analysis.questions
        .slice(0, Math.min(analysis.questions.length, 6))
        .map((question) => question.id);
    });
  }, [analysis]);

  async function copySurveyLink() {
    if (!analysis?.survey.token) return;

    const url = `${window.location.origin}/survey/${analysis.survey.token}`;
    await navigator.clipboard.writeText(url);
    setFeedback("تم نسخ رابط الاستبيان.");
  }

  async function exportSurveyExcel() {
    const url = `/api/dashboard/surveys/${surveyId}/export`;
    if (Capacitor.isNativePlatform()) {
      await downloadUrlAsFile(url, `survey-${surveyId}.xlsx`);
      return;
    }

    window.location.href = url;
  }

  function toggleReportQuestion(questionId: string) {
    setSelectedReportQuestionIds((previous) => {
      if (previous.includes(questionId)) {
        return previous.filter((item) => item !== questionId);
      }

      if (previous.length >= 10) {
        setFeedback("التقرير الرسمي صفحة واحدة، لذلك اختر 10 أسئلة كحد أقصى.");
        return previous;
      }

      return [...previous, questionId];
    });
  }

  function selectAllReportQuestions() {
    if (!analysis?.questions.length) return;

    setSelectedReportQuestionIds(
      analysis.questions
        .slice(0, Math.min(analysis.questions.length, 10))
        .map((question) => question.id),
    );

    if (analysis.questions.length > 10) {
      setFeedback("تم اختيار أول 10 أسئلة فقط لأن التقرير صفحة واحدة.");
    }
  }

  function clearReportQuestions() {
    setSelectedReportQuestionIds([]);
  }

  async function openSurveyPdf() {
    if (!selectedReportQuestionIds.length) {
      setFeedback("اختر سؤالًا واحدًا على الأقل قبل تصدير PDF.");
      return;
    }

    if (printExportStatus === "loading") {
      return;
    }

    const params = new URLSearchParams();
    params.set("questionIds", selectedReportQuestionIds.join(","));
    params.set("print", "1");

    const printUrl = `/api/dashboard/surveys/${surveyId}/export/pdf?${params.toString()}`;
    const result = await runPrintExport({
      printUrl,
      blockedTitle: "معاينة طباعة تقرير الاستبيان",
      blockedMessage:
        "تم حظر فتح معاينة الطباعة تلقائيًا. استخدم الزر أدناه لفتح تقرير الاستبيان في تبويب جديد.",
      errorTitle: "تصدير PDF",
      errorMessage: "تعذر فتح تقرير الاستبيان للطباعة. حاول مرة أخرى.",
    });

    if (result === "opened") {
      setFeedback("تم فتح تقرير PDF في تبويب جديد. اختر حفظ كـ PDF من نافذة الطباعة.");
    }
  }

  if (isLoading) {
    return <BrandLoader variant="section" label="جاري تحميل تحليل الاستبيان..." />;
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-700">
        {error}
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-l from-sky-800 to-cyan-700 p-4 text-white shadow-sm">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <h1 className="text-2xl font-black leading-tight">
              {analysis.survey.title}
            </h1>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <button
              type="button"
              onClick={openSurveyPdf}
              disabled={printExportStatus === "loading"}
              className="inline-flex h-10 min-w-[92px] items-center justify-center gap-1.5 rounded-full bg-white px-4 text-sm font-black text-sky-800 shadow-sm transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>{printExportStatus === "loading" ? "..." : "PDF"}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-80" />
            </button>

            <button
              type="button"
              onClick={exportSurveyExcel}
              className="inline-flex h-10 min-w-[92px] items-center justify-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-4 text-sm font-black text-white shadow-sm transition hover:bg-white/20"
            >
              <span>Excel</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-80" />
            </button>

            <a
              href="/dashboard/surveys/report-linking"
              className="inline-flex h-10 min-w-[132px] items-center justify-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 text-sm font-black text-white shadow-sm transition hover:bg-white/20"
            >
              <span>ربط التقارير</span>
              <Link2 className="h-3.5 w-3.5 opacity-90" />
            </a>
          </div>
        </div>
      </section>
      {feedback ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {feedback}
        </div>
      ) : null}


      <details className="group rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6">
          <div>
            <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-slate-100">
              اختر البيانات التي ستظهر في PDF
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full bg-sky-50 px-4 py-2 text-sm font-black text-sky-700 ring-1 ring-sky-100">
              {selectedReportQuestionIds.length} محدد
            </span>

            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-lg font-black text-slate-500 transition group-open:rotate-180">
              ˅
            </span>
          </div>
        </summary>

        <div className="border-t border-slate-100 p-6">
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={selectAllReportQuestions}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              أول 10 أسئلة
            </button>

            <button
              type="button"
              onClick={clearReportQuestions}
              className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-black text-rose-700 transition hover:bg-rose-50"
            >
              إلغاء التحديد
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {analysis.questions.map((question, index) => {
              const checked = selectedReportQuestionIds.includes(question.id);

              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => toggleReportQuestion(question.id)}
                  className={[
                    "rounded-2xl border p-4 text-right transition",
                    checked
                      ? "border-sky-300 bg-sky-50"
                      : "border-slate-200 bg-white hover:border-sky-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-400">س{index + 1} · {questionTypeLabel(question.type)}</p>
                      <h3 className="mt-1 line-clamp-2 text-sm font-black leading-6 text-slate-950">
                        {question.label}
                      </h3>
                    </div>

                    <span
                      className={[
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-black",
                        checked
                          ? "border-sky-700 bg-sky-700 text-white"
                          : "border-slate-300 bg-white text-slate-300",
                      ].join(" ")}
                    >
                      ✓
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                    <span>{question.answeredCount} إجابة</span>
                    <span>{question.answerRate}% معدل</span>
                    {question.average !== null ? <span>متوسط {question.average}</span> : null}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
            المحدد الآن: {selectedReportQuestionIds.length} سؤال · الحد الأعلى للتقرير الرسمي صفحة واحدة: 10 أسئلة.
          </div>
        </div>
      </details>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SurveyMetricCard
          label="عدد الردود"
          value={analysis.totals.responses}
          icon={MessageCircle}
        />

        <SurveyMetricCard
          label="عدد الأسئلة"
          value={analysis.totals.questions}
          icon={ListChecks}
        />

        <SurveyMetricCard
          label="اكتمال الأسئلة المطلوبة"
          value={`${analysis.totals.completionRate}%`}
          icon={CheckCircle2}
          valueClassName="text-emerald-700"
        />

        <SurveyMetricCard
          label="أسئلة قابلة للرسم"
          value={numericQuestions.length + choiceQuestions.length}
          icon={BarChart3}
          valueClassName="text-sky-700"
        />
      </section>
<section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-slate-950">متوسط الأسئلة الرقمية</h2>
          <p className="mt-1 text-sm text-slate-500">يعرض متوسط التقييم والمقاييس الرقمية داخل الاستبيان.</p>

          <div className="mt-5 h-80">
            {numericQuestions.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={numericQuestions.map((question) => ({ name: question.label, المتوسط: question.average || 0 }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="المتوسط" fill="#0284c7" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-300 text-sm text-slate-500">
                لا توجد أسئلة رقمية قابلة للرسم.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-slate-950">ملخص توزيع أول سؤال اختيارات</h2>
          <p className="mt-1 text-sm text-slate-500">يعرض Pie Chart لأول سؤال اختيارات لديه ردود.</p>

          <div className="mt-5 h-80">
            {choiceQuestions.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Legend />
                  <Pie
                    data={choiceQuestions[0].optionCounts.filter((option) => option.count > 0)}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={55}
                    outerRadius={105}
                    paddingAngle={3}
                    label
                  >
                    {choiceQuestions[0].optionCounts
                      .filter((option) => option.count > 0)
                      .map((option, index) => (
                        <Cell key={option.label} fill={chartColors[index % chartColors.length]} />
                      ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-300 text-sm text-slate-500">
                لا توجد أسئلة اختيارات لديها ردود.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-bold text-slate-950">تحليل الأسئلة</h2>
        <p className="mt-1 text-sm text-slate-500">
          يعرض هذا القسم القيم المستخرجة من كل سؤال حسب نوعه.
        </p>

        <div className="mt-5 space-y-4">
          {analysis.questions.map((question, index) => {
            const choiceData = question.optionCounts.filter((option) => option.count > 0);
            const numericData =
              question.average !== null
                ? [
                    { name: "أقل قيمة", value: question.min || 0 },
                    { name: "المتوسط", value: question.average || 0 },
                    { name: "أعلى قيمة", value: question.max || 0 },
                  ]
                : [];

            return (
              <article key={question.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
                        السؤال {index + 1}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-sky-700">
                        {questionTypeLabel(question.type)}
                      </span>
                      {question.isRequired ? (
                        <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
                          مطلوب
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-3 font-bold text-slate-950">{question.label}</h3>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-lg font-bold text-slate-950">{question.answeredCount}</p>
                      <p className="mt-1 text-xs text-slate-500">إجابة</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-lg font-bold text-slate-950">{question.emptyCount}</p>
                      <p className="mt-1 text-xs text-slate-500">فارغ</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-lg font-bold text-sky-700">{question.answerRate}%</p>
                      <p className="mt-1 text-xs text-slate-500">معدل الإجابة</p>
                    </div>
                  </div>
                </div>

                {question.average !== null ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs text-slate-500">المتوسط</p>
                      <p className="mt-1 text-2xl font-bold text-slate-950">{question.average}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs text-slate-500">أقل قيمة</p>
                      <p className="mt-1 text-2xl font-bold text-slate-950">{question.min}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs text-slate-500">أعلى قيمة</p>
                      <p className="mt-1 text-2xl font-bold text-slate-950">{question.max}</p>
                    </div>
                  </div>
                ) : null}

                {isNumericQuestion(question.type) && numericData.length ? (
                  <div className="mt-4 rounded-3xl bg-white p-4">
                    <p className="mb-3 text-sm font-bold text-slate-800">رسم القيم الرقمية</p>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={numericData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#059669" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : null}

                {choiceData.length > 0 ? (
                  <div className="mt-4 grid gap-4 xl:grid-cols-2">
                    <div className="rounded-3xl bg-white p-4">
                      <p className="mb-3 text-sm font-bold text-slate-800">Pie Chart</p>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Tooltip />
                            <Legend />
                            <Pie
                              data={choiceData}
                              dataKey="count"
                              nameKey="label"
                              innerRadius={45}
                              outerRadius={90}
                              paddingAngle={3}
                              label
                            >
                              {choiceData.map((option, optionIndex) => (
                                <Cell key={option.label} fill={chartColors[optionIndex % chartColors.length]} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="rounded-3xl bg-white p-4">
                      <p className="mb-3 text-sm font-bold text-slate-800">Bar Chart</p>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={choiceData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#0284c7" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                ) : null}

                {question.type === "TEXT" || question.type === "TEXTAREA" ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-bold text-slate-800">عينات من الإجابات النصية</p>
                    {question.textSamples.length > 0 ? (
                      <div
                        className={[
                          "space-y-2 rounded-2xl border border-slate-200 bg-slate-100/70 p-2",
                          question.textSamples.length > 4
                            ? "max-h-[18rem] touch-pan-y overflow-y-auto overscroll-contain"
                            : "",
                        ].join(" ")}
                        dir="rtl"
                      >
                        {question.textSamples.map((sample) => (
                          <div
                            key={sample.id}
                            className="whitespace-pre-wrap break-words rounded-xl border border-slate-100 bg-white p-4 text-right text-sm leading-7 text-slate-700"
                          >
                            {sample.value}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-2xl bg-white p-4 text-sm leading-7 text-slate-500">
                        لا توجد إجابات نصية حتى الآن.
                      </p>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <PrintExportPopCard
        modal={printExportModal}
        onClose={closeModal}
        onOpenFallback={openFallbackPrintUrl}
      />
    </div>
  );
}
