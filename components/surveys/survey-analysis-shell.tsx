"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

type OptionCount = {
  label: string;
  count: number;
  percentage: number;
};

type TextSample = {
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

export function SurveyAnalysisShell({ surveyId, boardPath }: SurveyAnalysisShellProps) {
  const [analysis, setAnalysis] = useState<SurveyAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

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

  async function copySurveyLink() {
    if (!analysis?.survey.token) return;

    const url = `${window.location.origin}/survey/${analysis.survey.token}`;
    await navigator.clipboard.writeText(url);
    setFeedback("تم نسخ رابط الاستبيان.");
  }

  function exportSurveyExcel() {
    window.location.href = `/api/dashboard/surveys/${surveyId}/export`;
  }

  function openSurveyPdf() {
    window.location.href = `/api/dashboard/surveys/${surveyId}/export/pdf`;
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        جاري تحميل تحليل الاستبيان...
      </div>
    );
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
      {Array.isArray((analysis as any)?.recommendations) && (analysis as any).recommendations.length > 0 ? (
        <details className="group rounded-3xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6">
            <div>
              <p className="text-sm font-bold text-sky-700">قراءة ذكية للنتائج</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">
                توصيات ومؤشرات سريعة
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {(analysis as any).recommendations.length} توصية
              </span>

              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-lg font-bold text-slate-500 transition group-open:rotate-180">
                ˅
              </span>
            </div>
          </summary>

          <div className="border-t border-slate-100 px-6 pb-6">
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {(analysis as any).recommendations.map((item: any, index: number) => {
                const toneClass =
                  item.tone === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : item.tone === "danger"
                      ? "border-rose-200 bg-rose-50 text-rose-800"
                      : item.tone === "warning"
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-sky-200 bg-sky-50 text-sky-800";

                const badgeClass =
                  item.tone === "success"
                    ? "bg-emerald-100 text-emerald-800"
                    : item.tone === "danger"
                      ? "bg-rose-100 text-rose-800"
                      : item.tone === "warning"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-sky-100 text-sky-800";

                const badgeLabel =
                  item.tone === "success"
                    ? "إيجابي"
                    : item.tone === "danger"
                      ? "عاجل"
                      : item.tone === "warning"
                        ? "تنبيه"
                        : "معلومة";

                return (
                  <article key={`${item.title}-${index}`} className={`rounded-3xl border p-4 ${toneClass}`}>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold">{item.title}</h3>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${badgeClass}`}>
                        {badgeLabel}
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-7 opacity-90">{item.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </details>
      ) : null}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link href={boardPath} className="text-sm font-bold text-sky-700">
              العودة إلى مركز الاستبيانات
            </Link>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                {statusLabel(analysis.survey.status)}
              </span>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                {surveyAudienceLabels[analysis.survey.audienceType] || analysis.survey.audienceType}
              </span>
              {analysis.survey.isAnonymous ? (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                  مجهول الهوية
                </span>
              ) : null}
            </div>

            <h1 className="mt-3 text-2xl font-bold text-slate-950">{analysis.survey.title}</h1>

            {analysis.survey.description ? (
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{analysis.survey.description}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openSurveyPdf}
              className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-700 transition hover:bg-sky-100"
            >
              تصدير PDF
            </button>

            <button
              type="button"
              onClick={exportSurveyExcel}
              className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
            >
              تصدير Excel
            </button>

            <button
              type="button"
              onClick={copySurveyLink}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              نسخ رابط الاستبيان
            </button>
          </div>
        </div>
      </section>

      {feedback ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {feedback}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">عدد الردود</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{analysis.totals.responses}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">عدد الأسئلة</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{analysis.totals.questions}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">اكتمال الأسئلة المطلوبة</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{analysis.totals.completionRate}%</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">أسئلة قابلة للرسم</p>
          <p className="mt-2 text-3xl font-bold text-sky-700">{numericQuestions.length + choiceQuestions.length}</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
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

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
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

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
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

                {question.textSamples.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-bold text-slate-800">عينات من الإجابات النصية</p>
                    {question.textSamples.map((sample, sampleIndex) => (
                      <div
                        key={`${question.id}-${sampleIndex}`}
                        className="rounded-2xl bg-white p-4 text-sm leading-7 text-slate-700"
                      >
                        {sample.value}
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}