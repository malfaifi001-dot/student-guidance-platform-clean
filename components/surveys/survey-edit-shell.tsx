"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  surveyAudienceLabels,
  surveyQuestionTypeLabels,
  type SurveyQuestionInputType,
} from "@/lib/surveys/survey-config";

type QuestionDraft = {
  label: string;
  type: SurveyQuestionInputType;
  isRequired: boolean;
  optionsText: string;
};

type SurveyEditShellProps = {
  surveyId: string;
  boardPath: string;
};

type LoadedSurvey = {
  id: string;
  title: string;
  description?: string | null;
  audienceType: string;
  isAnonymous: boolean;
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
  opensAt?: string | null;
  endsAt?: string | null;
  questions: {
    id: string;
    label: string;
    type: SurveyQuestionInputType;
    isRequired: boolean;
    options: {
      id: string;
      label: string;
    }[];
  }[];
  _count?: {
    responses: number;
  };
};

function toDatetimeLocal(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return localDate.toISOString().slice(0, 16);
}

function fromDatetimeLocal(value: string) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

export function SurveyEditShell({ surveyId, boardPath }: SurveyEditShellProps) {
  const [survey, setSurvey] = useState<LoadedSurvey | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audienceType, setAudienceType] = useState("GENERAL");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [opensAt, setOpensAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSurvey() {
    setIsLoading(true);
    setError(null);

    const response = await fetch(`/api/dashboard/surveys/${surveyId}`, {
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    setIsLoading(false);

    if (!response.ok) {
      setError(data?.error || "تعذر تحميل الاستبيان.");
      return;
    }

    const loadedSurvey = data?.survey as LoadedSurvey;

    setSurvey(loadedSurvey);
    setTitle(loadedSurvey.title || "");
    setDescription(loadedSurvey.description || "");
    setAudienceType(loadedSurvey.audienceType || "GENERAL");
    setIsAnonymous(Boolean(loadedSurvey.isAnonymous));
    setOpensAt(toDatetimeLocal(loadedSurvey.opensAt));
    setEndsAt(toDatetimeLocal(loadedSurvey.endsAt));
    setQuestions(
      loadedSurvey.questions.map((question) => ({
        label: question.label,
        type: question.type,
        isRequired: question.isRequired,
        optionsText: question.options.map((option) => option.label).join("\n"),
      })),
    );
  }

  useEffect(() => {
    loadSurvey();
  }, [surveyId]);

  function updateQuestion(index: number, patch: Partial<QuestionDraft>) {
    setQuestions((current) =>
      current.map((question, itemIndex) =>
        itemIndex === index
          ? {
              ...question,
              ...patch,
            }
          : question,
      ),
    );
  }

  function addQuestion() {
    setQuestions((current) => [
      ...current,
      {
        label: "",
        type: "TEXT",
        isRequired: false,
        optionsText: "",
      },
    ]);
  }

  function removeQuestion(index: number) {
    setQuestions((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSaving(true);
    setFeedback(null);
    setError(null);

    const response = await fetch(`/api/dashboard/surveys/${surveyId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "update-draft",
        title,
        description,
        audienceType,
        isAnonymous,
        opensAt: fromDatetimeLocal(opensAt),
        endsAt: fromDatetimeLocal(endsAt),
        questions: questions.map((question) => ({
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
      setError(data?.error || "تعذر تحديث الاستبيان.");
      return;
    }

    setFeedback(data?.message || "تم تحديث الاستبيان.");
    await loadSurvey();
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        جاري تحميل الاستبيان...
      </div>
    );
  }

  if (error && !survey) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-700">
        {error}
      </div>
    );
  }

  if (!survey) {
    return null;
  }

  const isEditable = survey.status === "DRAFT" && (survey._count?.responses || 0) === 0;

  return (
    <div className="space-y-6" dir="rtl">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link href={boardPath} className="text-sm font-bold text-sky-700">
          العودة إلى مركز الاستبيانات
        </Link>

        <h1 className="mt-3 text-2xl font-bold text-slate-950">تعديل الاستبيان</h1>

        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
          يمكن تعديل الاستبيان وهو في حالة مسودة فقط. بعد النشر يتم تثبيت الأسئلة لحماية دقة التحليل والردود.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            الحالة: {survey.status === "DRAFT" ? "مسودة" : survey.status}
          </span>
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
            {surveyAudienceLabels[survey.audienceType] || survey.audienceType}
          </span>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
            الردود: {survey._count?.responses || 0}
          </span>
        </div>
      </section>

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

      {!isEditable ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm font-semibold leading-7 text-amber-800">
          لا يمكن تعديل هذا الاستبيان لأنه لم يعد مسودة أو لأنه يحتوي على ردود. استخدم زر النسخ لإنشاء نسخة قابلة للتعديل.
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>عنوان الاستبيان</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={!isEditable}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400 disabled:bg-slate-50"
              placeholder="عنوان الاستبيان"
            />
          </label>

          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>الفئة المستهدفة</span>
            <select
              value={audienceType}
              onChange={(event) => setAudienceType(event.target.value)}
              disabled={!isEditable}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400 disabled:bg-slate-50"
            >
              {Object.entries(surveyAudienceLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="space-y-2 text-sm font-semibold text-slate-700">
          <span>الوصف</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={!isEditable}
            className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400 disabled:bg-slate-50"
            placeholder="وصف مختصر يظهر للمستفيدين"
          />
        </label>

        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="font-bold text-slate-950">فترة استقبال الردود</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            اترك الحقول فارغة إذا أردت أن يكون الاستبيان متاحًا مباشرة بعد النشر وبدون تاريخ نهاية.
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              <span>بداية الاستقبال</span>
              <input
                type="datetime-local"
                value={opensAt}
                onChange={(event) => setOpensAt(event.target.value)}
                disabled={!isEditable}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400 disabled:bg-slate-100"
              />
            </label>

            <label className="space-y-2 text-sm font-semibold text-slate-700">
              <span>نهاية الاستقبال</span>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
                disabled={!isEditable}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400 disabled:bg-slate-100"
              />
            </label>
          </div>
        </section>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(event) => setIsAnonymous(event.target.checked)}
            disabled={!isEditable}
          />
          <span>استبيان مجهول الهوية</span>
        </label>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-950">الأسئلة</h2>
              <p className="mt-1 text-sm text-slate-500">يمكن ترتيب الأسئلة ضمنيًا حسب ظهورها هنا.</p>
            </div>

            {isEditable ? (
              <button
                type="button"
                onClick={addQuestion}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                إضافة سؤال
              </button>
            ) : null}
          </div>

          {questions.map((question, index) => {
            const needsOptions = question.type === "SINGLE_CHOICE" || question.type === "MULTIPLE_CHOICE";

            return (
              <div key={index} className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-slate-800">السؤال {index + 1}</p>

                  {isEditable && questions.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      className="text-xs font-bold text-rose-600"
                    >
                      حذف
                    </button>
                  ) : null}
                </div>

                <input
                  value={question.label}
                  onChange={(event) => updateQuestion(index, { label: event.target.value })}
                  disabled={!isEditable}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400 disabled:bg-slate-100"
                  placeholder="نص السؤال"
                />

                <div className="grid gap-3 md:grid-cols-2">
                  <select
                    value={question.type}
                    onChange={(event) =>
                      updateQuestion(index, {
                        type: event.target.value as SurveyQuestionInputType,
                      })
                    }
                    disabled={!isEditable}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400 disabled:bg-slate-100"
                  >
                    {Object.entries(surveyQuestionTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>

                  <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={question.isRequired}
                      onChange={(event) => updateQuestion(index, { isRequired: event.target.checked })}
                      disabled={!isEditable}
                    />
                    <span>إجابة مطلوبة</span>
                  </label>
                </div>

                {needsOptions ? (
                  <label className="space-y-2 text-sm font-semibold text-slate-700">
                    <span>الخيارات، كل خيار في سطر مستقل</span>
                    <textarea
                      value={question.optionsText}
                      onChange={(event) => updateQuestion(index, { optionsText: event.target.value })}
                      disabled={!isEditable}
                      className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400 disabled:bg-slate-100"
                      placeholder={"راضٍ جدًا\nراضٍ\nمحايد\nغير راضٍ"}
                    />
                  </label>
                ) : null}
              </div>
            );
          })}
        </section>

        {isEditable ? (
          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-2xl bg-slate-900 px-5 py-4 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "جاري الحفظ..." : "حفظ التعديلات"}
          </button>
        ) : null}
      </form>
    </div>
  );
}