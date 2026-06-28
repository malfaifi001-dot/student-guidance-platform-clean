"use client";

import { FormEvent, useState } from "react";
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
  options: string[];
};

type Props = {
  ownerRole: SurveyBoardRole;
  boardPath: string;
};

const initialQuestions: QuestionDraft[] = [
  {
    label: "ما مدى رضاك عن الخدمة المقدمة؟",
    type: "RATING",
    isRequired: true,
    options: [],
  },
  {
    label: "ما أبرز ملاحظاتك أو مقترحاتك؟",
    type: "TEXTAREA",
    isRequired: false,
    options: [],
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

export function SurveyNewShell({ ownerRole, boardPath }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audienceType, setAudienceType] = useState("GENERAL");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [opensAt, setOpensAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleCreateSurvey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving) return;

    setIsSaving(true);
    setError("");

    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setIsSaving(false);
      setError("اكتب عنوان الاستبيان أولًا.");
      return;
    }

    const response = await fetch("/api/dashboard/surveys", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: cleanTitle,
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
          options: question.options,
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

    const surveyId = data?.survey?.id;

    if (!surveyId) {
      setError("تم إنشاء المسودة لكن تعذر فتح صفحة التعديل.");
      return;
    }

    router.push(`${boardPath}/${surveyId}/edit`);
  }

  return (
    <div className="space-y-7" dir="rtl">
      <section className="overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-sky-800 via-cyan-700 to-sky-500 p-8 text-white shadow-xl">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <h1 className="text-4xl font-black">
              استبيان جديد
            </h1>
          </div>

          <a
            href={boardPath}
            className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-black text-sky-800 transition hover:bg-sky-50"
          >
            العودة للاستبيانات
          </a>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={handleCreateSurvey}
        className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <label className="space-y-2 text-sm font-black text-slate-700">
            <span>عنوان الاستبيان</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-sky-400"
              placeholder="مثال: قياس رضا أولياء الأمور"
            />
          </label>

          <label className="space-y-2 text-sm font-black text-slate-700">
            <span>الفئة المستهدفة</span>
            <select
              value={audienceType}
              onChange={(event) => setAudienceType(event.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-sky-400"
            >
              {Object.entries(surveyAudienceLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-5 block space-y-2 text-sm font-black text-slate-700">
          <span>الوصف</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
            placeholder="وصف مختصر"
          />
        </label>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <label className="space-y-2 text-sm font-black text-slate-700">
            <span>بداية الردود</span>
            <input
              type="datetime-local"
              value={opensAt}
              onChange={(event) => setOpensAt(event.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-sky-400"
            />
          </label>

          <label className="space-y-2 text-sm font-black text-slate-700">
            <span>نهاية الردود</span>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-sky-400"
            />
          </label>
        </div>

        <label className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700">
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
          className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "جاري الحفظ..." : "إنشاء المسودة"}
        </button>
      </form>
    </div>
  );
}