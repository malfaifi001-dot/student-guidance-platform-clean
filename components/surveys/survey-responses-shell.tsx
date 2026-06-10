"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { surveyAudienceLabels } from "@/lib/surveys/survey-config";

type SurveyQuestion = {
  id: string;
  label: string;
  type: string;
  isRequired: boolean;
};

type SurveyResponseAnswer = {
  questionId: string;
  questionLabel: string;
  questionType: string;
  value: string;
};

type SurveyResponseRow = {
  index: number;
  id: string;
  submittedAt: string;
  respondentType: string;
  respondentName?: string | null;
  respondentPhone?: string | null;
  answers: SurveyResponseAnswer[];
};

type SurveyResponsesPayload = {
  survey: {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    audienceType: string;
    isAnonymous: boolean;
    questions: SurveyQuestion[];
  };
  totals: {
    allResponses: number;
    filteredResponses: number;
    questions: number;
  };
  responses: SurveyResponseRow[];
};

type SurveyResponsesShellProps = {
  surveyId: string;
  boardPath: string;
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

export function SurveyResponsesShell({ surveyId, boardPath }: SurveyResponsesShellProps) {
  const [payload, setPayload] = useState<SurveyResponsesPayload | null>(null);
  const [query, setQuery] = useState("");
  const [respondentType, setRespondentType] = useState("");
  const [expandedResponseId, setExpandedResponseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const respondentTypes = useMemo(() => {
    const set = new Set<string>();

    payload?.responses.forEach((response) => {
      if (response.respondentType) {
        set.add(response.respondentType);
      }
    });

    return Array.from(set);
  }, [payload]);

  async function loadResponses() {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();

    if (query.trim()) {
      params.set("q", query.trim());
    }

    if (respondentType) {
      params.set("respondentType", respondentType);
    }

    const response = await fetch(`/api/dashboard/surveys/${surveyId}/responses?${params.toString()}`, {
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    setIsLoading(false);

    if (!response.ok) {
      setError(data?.error || "تعذر تحميل الردود.");
      return;
    }

    setPayload(data);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadResponses();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [surveyId, query, respondentType]);

  return (
    <div className="space-y-6" dir="rtl">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link href={boardPath} className="text-sm font-bold text-sky-700">
              العودة إلى مركز الاستبيانات
            </Link>

            <h1 className="mt-3 text-2xl font-bold text-slate-950">
              الردود الخام للاستبيان
            </h1>

            {payload?.survey ? (
              <>
                <p className="mt-2 text-lg font-bold text-slate-800">{payload.survey.title}</p>
                {payload.survey.description ? (
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{payload.survey.description}</p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                    {surveyAudienceLabels[payload.survey.audienceType] || payload.survey.audienceType}
                  </span>

                  {payload.survey.isAnonymous ? (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                      مجهول الهوية
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      بيانات المستجيب اختيارية
                    </span>
                  )}
                </div>
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`${boardPath}/${surveyId}/analysis`}
              className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-700 transition hover:bg-sky-100"
            >
              التحليل
            </Link>

            <button
              type="button"
              onClick={loadResponses}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              تحديث الردود
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">إجمالي الردود</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{payload?.totals.allResponses || 0}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">النتائج المعروضة</p>
          <p className="mt-2 text-3xl font-bold text-sky-700">{payload?.totals.filteredResponses || 0}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">عدد الأسئلة</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{payload?.totals.questions || 0}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>البحث في الردود</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
              placeholder="ابحث باسم المستجيب أو رقم الجوال أو أي إجابة"
            />
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>نوع المستجيب</span>
            <select
              value={respondentType}
              onChange={(event) => setRespondentType(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
            >
              <option value="">الكل</option>
              {respondentTypes.map((type) => (
                <option key={type} value={type}>
                  {surveyAudienceLabels[type] || type}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          جاري تحميل الردود...
        </div>
      ) : null}

      {!isLoading && payload?.responses.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          لا توجد ردود مطابقة.
        </div>
      ) : null}

      <section className="space-y-4">
        {payload?.responses.map((response) => {
          const isExpanded = expandedResponseId === response.id;

          return (
            <article key={response.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      رد رقم {response.index}
                    </span>
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                      {surveyAudienceLabels[response.respondentType] || response.respondentType}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {new Date(response.submittedAt).toLocaleString("ar-SA")}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                    <p>
                      <span className="font-bold text-slate-800">الاسم: </span>
                      {response.respondentName || "غير مذكور"}
                    </p>
                    <p>
                      <span className="font-bold text-slate-800">الجوال: </span>
                      {response.respondentPhone || "غير مذكور"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedResponseId(isExpanded ? null : response.id)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  {isExpanded ? "إخفاء التفاصيل" : "عرض التفاصيل"}
                </button>
              </div>

              {isExpanded ? (
                <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr>
                        <th className="w-2/5 border-b border-slate-200 px-4 py-3 text-right">السؤال</th>
                        <th className="border-b border-slate-200 px-4 py-3 text-right">الإجابة</th>
                        <th className="w-36 border-b border-slate-200 px-4 py-3 text-right">النوع</th>
                      </tr>
                    </thead>
                    <tbody>
                      {response.answers.map((answer) => (
                        <tr key={answer.questionId} className="border-b border-slate-100 last:border-b-0">
                          <td className="px-4 py-3 align-top font-semibold text-slate-800">
                            {answer.questionLabel}
                          </td>
                          <td className="px-4 py-3 align-top leading-7 text-slate-700">
                            {answer.value || "بدون إجابة"}
                          </td>
                          <td className="px-4 py-3 align-top text-xs font-bold text-slate-500">
                            {questionTypeLabel(answer.questionType)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
}