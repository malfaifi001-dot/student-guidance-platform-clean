"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  surveyAudienceLabels,
  type SurveyBoardRole,
  type SurveyQuestionInputType,
} from "@/lib/surveys/survey-config";

type QuestionDraft = {
  label: string;
  type: SurveyQuestionInputType;
  isRequired: boolean;
  optionsText: string;
};

type SurveyListItem = {
  id: string;
  title: string;
  description?: string | null;
  audienceType: string;
  ownerRole?: string | null;
  boardPath?: string | null;
  isAnonymous: boolean;
  token: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  _count?: {
    questions: number;
    responses: number;
  };
};

type SurveyCenterShellProps = {
  ownerRole: SurveyBoardRole;
  boardPath: string;
};

const initialQuestions: QuestionDraft[] = [
  {
    label: "ما مدى رضاك عن الخدمة المقدمة؟",
    type: "RATING",
    isRequired: true,
    optionsText: "",
  },
  {
    label: "ما أبرز ملاحظاتك أو مقترحاتك؟",
    type: "TEXTAREA",
    isRequired: false,
    optionsText: "",
  },
];

function fromDatetimeLocal(value: string) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function getSurveyStatusLabel(status: SurveyListItem["status"]) {
  if (status === "DRAFT") return "مسودة";
  if (status === "PUBLISHED") return "منشور";
  if (status === "CLOSED") return "مغلق";
  return "مؤرشف";
}

function getSurveyStatusClass(status: SurveyListItem["status"]) {
  if (status === "DRAFT") {
    return "bg-amber-50 text-amber-700";
  }

  if (status === "PUBLISHED") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "CLOSED") {
    return "bg-slate-100 text-slate-700";
  }

  return "bg-slate-200 text-slate-700";
}

export function SurveyCenterShell({
  ownerRole,
  boardPath,
}: SurveyCenterShellProps) {
  const router = useRouter();
  const [surveys, setSurveys] = useState<SurveyListItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audienceType, setAudienceType] = useState("GENERAL");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [opensAt, setOpensAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSurveys() {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams({
      ownerRole,
      boardPath,
    });

    const response = await fetch(`/api/dashboard/surveys?${params.toString()}`, {
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    setIsLoading(false);

    if (!response.ok) {
      setError(data?.error || "تعذر تحميل الاستبيانات.");
      return;
    }

    setSurveys(data?.surveys || []);
  }

  useEffect(() => {
    loadSurveys();
  }, [ownerRole, boardPath]);

  async function handleCreateSurvey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSaving(true);
    setFeedback(null);
    setError(null);

    const response = await fetch("/api/dashboard/surveys", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        description,
        audienceType,
        ownerRole,
        boardPath,
        isAnonymous,
        opensAt: fromDatetimeLocal(opensAt),
        endsAt: fromDatetimeLocal(endsAt),
        questions: initialQuestions.map((question) => ({
          label: question.label,
          type: question.type,
          isRequired: question.isRequired,
          options: question.optionsText
            .split("\n")
            .map((option) => option.trim())
            .filter(Boolean),
          scaleMin: 1,
          scaleMax: 5,
        })),
      }),
    });

    const data = await response.json().catch(() => null);

    setIsSaving(false);

    if (!response.ok) {
      setError(data?.error || "تعذر إنشاء الاستبيان.");
      return;
    }

    setFeedback(data?.message || "تم إنشاء الاستبيان.");
    const createdSurveyId = data?.survey?.id;

    if (createdSurveyId) {
      router.push(`${boardPath}/${createdSurveyId}/edit`);
      return;
    }

    setTitle("");
    setDescription("");
    setAudienceType("GENERAL");
    setIsAnonymous(false);
    setOpensAt("");
    setEndsAt("");
    await loadSurveys();
  }

  async function updateSurveyStatus(
    surveyId: string,
    action: "publish" | "close" | "archive",
  ) {
    setFeedback(null);
    setError(null);

    const response = await fetch(`/api/dashboard/surveys/${surveyId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setError(data?.error || "تعذر تنفيذ الإجراء.");
      return;
    }

    setFeedback(data?.message || "تم تنفيذ الإجراء.");
    await loadSurveys();
  }

  async function deleteSurvey(surveyId: string) {
    setFeedback(null);
    setError(null);

    const response = await fetch(`/api/dashboard/surveys/${surveyId}`, {
      method: "DELETE",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setError(data?.error || "تعذر حذف الاستبيان.");
      return;
    }

    setFeedback(data?.message || "تم حذف الاستبيان.");
    await loadSurveys();
  }

  async function copySurveyLink(token: string) {
    const url = `${window.location.origin}/survey/${token}`;
    await navigator.clipboard.writeText(url);
    setFeedback("تم نسخ رابط الاستبيان.");
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex justify-start">
        <a
          href={`${boardPath}/templates`}
          className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-100"
        >
          فتح القوالب
        </a>
      </div>

      {feedback ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {feedback}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <form
          onSubmit={handleCreateSurvey}
          className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm"
        >
          <h2 className="text-base font-bold text-slate-950">
            إنشاء استبيان جديد
          </h2>

          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>عنوان الاستبيان</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
              placeholder="مثال: قياس رضا أولياء الأمور"
            />
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>الوصف</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-20 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
              placeholder="وصف مختصر"
            />
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>الفئة المستهدفة</span>
            <select
              value={audienceType}
              onChange={(event) => setAudienceType(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
            >
              {Object.entries(surveyAudienceLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              <span>بداية استقبال الردود</span>
              <input
                type="datetime-local"
                value={opensAt}
                onChange={(event) => setOpensAt(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
              />
            </label>

            <label className="space-y-2 text-sm font-semibold text-slate-700">
              <span>نهاية استقبال الردود</span>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
              />
            </label>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(event) => setIsAnonymous(event.target.checked)}
            />
            <span>استبيان مجهول الهوية</span>
          </label>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "جاري الحفظ..." : "حفظ كمسودة"}
          </button>
        </form>

        <section className="space-y-3">
          {isLoading ? (
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              جاري تحميل الاستبيانات...
            </div>
          ) : null}

          {!isLoading && surveys.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              لا توجد استبيانات بعد.
            </div>
          ) : null}

          <div className="grid gap-3">
            {surveys.map((survey) => (
              <article
                key={survey.id}
                className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={[
                          "rounded-full px-3 py-1 text-xs font-bold",
                          getSurveyStatusClass(survey.status),
                        ].join(" ")}
                      >
                        {getSurveyStatusLabel(survey.status)}
                      </span>

                      <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                        {surveyAudienceLabels[survey.audienceType] ||
                          survey.audienceType}
                      </span>

                      {survey.isAnonymous ? (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                          مجهول الهوية
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-3 text-lg font-bold text-slate-950">
                      {survey.title}
                    </h3>

                    <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
                      <span>{survey._count?.questions || 0} سؤال</span>
                      <span>{survey._count?.responses || 0} رد</span>
                      <span>
                        آخر تحديث:{" "}
                        {new Date(survey.updatedAt).toLocaleDateString("ar-SA")}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 lg:items-end">
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <a
                        href={`${boardPath}/${survey.id}/analysis`}
                        className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-100"
                      >
                        تحليل
                      </a>

                      <a
                        href={`${boardPath}/${survey.id}/responses`}
                        className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
                      >
                        الردود
                      </a>

                      <a
                        href={`${boardPath}/${survey.id}/share`}
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        مشاركة
                      </a>

                      {survey.status === "DRAFT" ? (
                        <>
                          <a
                            href={`${boardPath}/${survey.id}/edit`}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                          >
                            تعديل
                          </a>

                          <button
                            type="button"
                            onClick={() =>
                              updateSurveyStatus(survey.id, "publish")
                            }
                            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                          >
                            نشر
                          </button>
                        </>
                      ) : survey.status === "PUBLISHED" ? (
                        <button
                          type="button"
                          onClick={() => copySurveyLink(survey.token)}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                        >
                          نسخ الرابط
                        </button>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <button
                        type="button"
                        onClick={async () => {
                          const response = await fetch(
                            `/api/dashboard/surveys/${survey.id}/duplicate`,
                            {
                              method: "POST",
                            },
                          );

                          const data = await response.json().catch(() => null);

                          if (!response.ok) {
                            window.alert(
                              data?.error || "تعذر نسخ الاستبيان.",
                            );
                            return;
                          }

                          window.location.href = `${boardPath}/${data.survey.id}/edit`;
                        }}
                        className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-[11px] font-bold text-violet-700 transition hover:bg-violet-100"
                      >
                        نسخ
                      </button>

                      {survey.status === "PUBLISHED" ? (
                        <button
                          type="button"
                          onClick={() => updateSurveyStatus(survey.id, "close")}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          إغلاق
                        </button>
                      ) : null}

                      {survey.status !== "ARCHIVED" ? (
                        <button
                          type="button"
                          onClick={() =>
                            updateSurveyStatus(survey.id, "archive")
                          }
                          className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          أرشفة
                        </button>
                      ) : null}

                      {survey.status === "DRAFT" ? (
                        <button
                          type="button"
                          onClick={() => deleteSurvey(survey.id)}
                          className="rounded-xl border border-rose-200 px-3 py-2 text-[11px] font-bold text-rose-700 transition hover:bg-rose-50"
                        >
                          حذف
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
