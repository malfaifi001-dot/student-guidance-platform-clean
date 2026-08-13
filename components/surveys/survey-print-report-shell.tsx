"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandLoader } from "@/components/common/brand-loader";
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

type SurveyPrintReportShellProps = {
  surveyId: string;
  backPath: string;
};

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

function statusLabel(status: string) {
  if (status === "DRAFT") return "مسودة";
  if (status === "PUBLISHED") return "منشور";
  if (status === "CLOSED") return "مغلق";
  if (status === "ARCHIVED") return "مؤرشف";
  return status;
}

function isChoiceQuestion(type: string) {
  return type === "YES_NO" || type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE";
}

export function SurveyPrintReportShell({ surveyId, backPath }: SurveyPrintReportShellProps) {
  const [analysis, setAnalysis] = useState<SurveyAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAnalysis() {
    setIsLoading(true);
    setError(null);

    const response = await fetch(`/api/dashboard/surveys/${surveyId}/analysis`, {
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    setIsLoading(false);

    if (!response.ok) {
      setError(data?.error || "تعذر تحميل تقرير الاستبيان.");
      return;
    }

    setAnalysis(data);
  }

  useEffect(() => {
    loadAnalysis();
  }, [surveyId]);

  if (isLoading) {
    return <BrandLoader variant="page" label="جاري تجهيز تقرير الاستبيان..." />;
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-100 p-8" dir="rtl">
        <div className="mx-auto max-w-3xl rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
          {error}
        </div>
      </main>
    );
  }

  if (!analysis) return null;

  return (
    <main className="min-h-screen bg-slate-100 py-8 print:bg-white" dir="rtl">
      <style jsx global>{`
        @page {
          size: A4;
          margin: 12mm;
        }

        @media print {
          body {
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .print-page {
            width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            page-break-after: auto;
          }

          .avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-5 flex max-w-5xl items-center justify-between gap-3 px-4">
        <Link href={backPath} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm">
          العودة للتحليل
        </Link>

        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
        >
          طباعة / حفظ PDF
        </button>
      </div>

      <section className="print-page mx-auto max-w-5xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <header className="avoid-break border-b border-slate-200 pb-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-bold text-sky-700">منصة التوجيه الطلابي</p>
              <h1 className="mt-3 text-3xl font-black text-slate-950">{analysis.survey.title}</h1>
              {analysis.survey.description ? (
                <p className="mt-3 max-w-3xl text-sm leading-8 text-slate-600">{analysis.survey.description}</p>
              ) : null}
            </div>

            <div className="rounded-3xl bg-slate-950 px-5 py-4 text-center text-white">
              <p className="text-xs opacity-80">تقرير استبيان</p>
              <p className="mt-2 text-lg font-black">{new Date().toLocaleDateString("ar-SA")}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              {statusLabel(analysis.survey.status)}
            </span>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
              {surveyAudienceLabels[analysis.survey.audienceType] || analysis.survey.audienceType}
            </span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              {analysis.survey.isAnonymous ? "مجهول الهوية" : "بيانات المستجيب اختيارية"}
            </span>
          </div>
        </header>

        <section className="avoid-break mt-6 grid grid-cols-4 gap-3">
          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-xs font-bold text-slate-500">عدد الردود</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{analysis.totals.responses}</p>
          </div>

          <div className="rounded-3xl bg-slate-50 p-5">
            <p className="text-xs font-bold text-slate-500">عدد الأسئلة</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{analysis.totals.questions}</p>
          </div>

          <div className="rounded-3xl bg-emerald-50 p-5">
            <p className="text-xs font-bold text-emerald-700">اكتمال المطلوب</p>
            <p className="mt-2 text-3xl font-black text-emerald-700">{analysis.totals.completionRate}%</p>
          </div>

          <div className="rounded-3xl bg-sky-50 p-5">
            <p className="text-xs font-bold text-sky-700">تاريخ التقرير</p>
            <p className="mt-2 text-lg font-black text-sky-700">{new Date().toLocaleDateString("ar-SA")}</p>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-black text-slate-950">الملخص التنفيذي</h2>
          <div className="mt-4 rounded-3xl bg-slate-50 p-5 text-sm leading-8 text-slate-700">
            تم جمع <strong>{analysis.totals.responses}</strong> ردًا على هذا الاستبيان، ويحتوي على{" "}
            <strong>{analysis.totals.questions}</strong> سؤالًا. بلغت نسبة اكتمال الأسئلة المطلوبة{" "}
            <strong>{analysis.totals.completionRate}%</strong>. يمكن استخدام هذا التقرير كشاهد داعم أو إرفاقه ضمن تقارير المدرسة.
          </div>
        </section>

        <section className="mt-8 space-y-5">
          <h2 className="text-xl font-black text-slate-950">تحليل الأسئلة</h2>

          {analysis.questions.map((question, index) => {
            const choiceData = question.optionCounts.filter((option) => option.count > 0);
            const maxOptionCount = Math.max(...choiceData.map((option) => option.count), 1);

            return (
              <article key={question.id} className="avoid-break rounded-3xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        السؤال {index + 1}
                      </span>
                      <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                        {questionTypeLabel(question.type)}
                      </span>
                      {question.isRequired ? (
                        <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
                          مطلوب
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-3 text-lg font-black text-slate-950">{question.label}</h3>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-lg font-black text-slate-950">{question.answeredCount}</p>
                      <p className="text-[11px] text-slate-500">إجابة</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-lg font-black text-slate-950">{question.emptyCount}</p>
                      <p className="text-[11px] text-slate-500">فارغ</p>
                    </div>
                    <div className="rounded-2xl bg-sky-50 px-4 py-3">
                      <p className="text-lg font-black text-sky-700">{question.answerRate}%</p>
                      <p className="text-[11px] text-slate-500">معدل</p>
                    </div>
                  </div>
                </div>

                {question.average !== null ? (
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">المتوسط</p>
                      <p className="mt-1 text-2xl font-black text-slate-950">{question.average}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">أقل قيمة</p>
                      <p className="mt-1 text-2xl font-black text-slate-950">{question.min}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">أعلى قيمة</p>
                      <p className="mt-1 text-2xl font-black text-slate-950">{question.max}</p>
                    </div>
                  </div>
                ) : null}

                {isChoiceQuestion(question.type) && choiceData.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    <p className="text-sm font-black text-slate-800">توزيع الاختيارات</p>
                    {choiceData.map((option) => (
                      <div key={option.label} className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-bold text-slate-800">{option.label}</span>
                          <span className="text-slate-600">
                            {option.count} رد — {option.percentage}%
                          </span>
                        </div>
                        <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
                          <div
                            className="h-full rounded-full bg-sky-600"
                            style={{ width: `${Math.max((option.count / maxOptionCount) * 100, 4)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {question.textSamples.length > 0 ? (
                  <div className="mt-5 space-y-2">
                    <p className="text-sm font-black text-slate-800">عينات من الإجابات النصية</p>
                    {question.textSamples.slice(0, 5).map((sample, sampleIndex) => (
                      <div key={`${question.id}-${sampleIndex}`} className="rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                        {sample.value}
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>

        <footer className="mt-8 border-t border-slate-200 pt-5 text-center text-xs text-slate-500">
          تم إنشاء هذا التقرير من مركز الاستبيانات في منصة التوجيه الطلابي.
        </footer>
      </section>
    </main>
  );
}
