"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  surveyAudienceLabels,
  surveyBoardLabels,
  surveyQuestionTypeLabels,
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
export function SurveyCenterShell({ ownerRole, boardPath }: SurveyCenterShellProps) {
  const [surveys, setSurveys] = useState<SurveyListItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audienceType, setAudienceType] = useState("GENERAL");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [opensAt, setOpensAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>(initialQuestions);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const publishedCount = useMemo(
    () => surveys.filter((survey) => survey.status === "PUBLISHED").length,
    [surveys],
  );

  const totalResponses = useMemo(
    () => surveys.reduce((sum, survey) => sum + (survey._count?.responses || 0), 0),
    [surveys],
  );

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
      setError(data?.error || "تعذر إنشاء الاستبيان.");
      return;
    }

    setFeedback(data?.message || "تم إنشاء الاستبيان.");
    setTitle("");
    setDescription("");
    setAudienceType("GENERAL");
    setIsAnonymous(false);
    setOpensAt("");
    setEndsAt("");
    setQuestions(initialQuestions);
    await loadSurveys();
  }

  async function updateSurveyStatus(surveyId: string, action: "publish" | "close" | "archive") {
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
    <div className="space-y-6" dir="rtl">
      <section className="rounded-3xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-sky-800">قوالب جاهزة</p>
            <p className="mt-1 text-sm text-sky-700">أنشئ استبيانًا من قالب جاهز ثم عدّله قبل النشر.</p>
          </div>

          <a
            href={`${boardPath}/templates`}
            className="rounded-2xl bg-sky-700 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-sky-800"
          >
            فتح القوالب
          </a>
        </div>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-sky-700">مركز عام قابل للتوجيه لأي لوحة</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">{surveyBoardLabels[ownerRole]}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
              أنشئ استبيانات، انشرها برابط عام، واجمع الردود من الطلاب أو أولياء الأمور أو الكادر التعليمي.
              هذا المركز مبني كمحرك عام، والصفحة الحالية مجرد مسار توجيه.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-2xl font-bold text-slate-950">{surveys.length}</p>
              <p className="mt-1 text-xs text-slate-500">استبيان</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-2xl font-bold text-emerald-700">{publishedCount}</p>
              <p className="mt-1 text-xs text-emerald-700">منشور</p>
            </div>
            <div className="rounded-2xl bg-sky-50 p-4">
              <p className="text-2xl font-bold text-sky-700">{totalResponses}</p>
              <p className="mt-1 text-xs text-sky-700">رد</p>
            </div>
          </div>
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

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form onSubmit={handleCreateSurvey} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-slate-950">إنشاء استبيان جديد</h2>
            <p className="mt-1 text-sm text-slate-500">يحفظ كمسودة، وبعد المراجعة يمكن نشره.</p>
          </div>

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
              placeholder="وصف مختصر يظهر للمستفيدين"
            />
          </label>

          <div className="grid gap-3 md:grid-cols-2">
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

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(event) => setIsAnonymous(event.target.checked)}
              />
              <span>استبيان مجهول الهوية</span>
            </label>
            <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
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

              <p className="md:col-span-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-semibold leading-6 text-slate-500">
                اترك التاريخ فارغًا إذا أردت أن يكون الاستبيان متاحًا مباشرة بعد النشر وبدون نهاية محددة.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900">الأسئلة</p>
              <button
                type="button"
                onClick={addQuestion}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                إضافة سؤال
              </button>
            </div>

            {questions.map((question, index) => {
              const needsOptions = question.type === "SINGLE_CHOICE" || question.type === "MULTIPLE_CHOICE";

              return (
                <div key={index} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-slate-800">السؤال {index + 1}</p>
                    {questions.length > 1 ? (
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
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
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
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
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
                        className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                        placeholder={"راضٍ جدًا\nراضٍ\nمحايد\nغير راضٍ"}
                      />
                    </label>
                  ) : null}
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "جاري الحفظ..." : "حفظ كمسودة"}
          </button>
        </form>

        <section className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">الاستبيانات</h2>
            <p className="mt-1 text-sm text-slate-500">انشر الاستبيان ثم انسخ رابطه وشاركه مع المستفيدين.</p>
          </div>

          {isLoading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              جاري تحميل الاستبيانات...
            </div>
          ) : null}

          {!isLoading && surveys.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              لا توجد استبيانات بعد.
            </div>
          ) : null}

          <div className="grid gap-4">
            {surveys.map((survey) => (
              <article key={survey.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        {survey.status === "DRAFT"
                          ? "مسودة"
                          : survey.status === "PUBLISHED"
                            ? "منشور"
                            : survey.status === "CLOSED"
                              ? "مغلق"
                              : "مؤرشف"}
                      </span>
                      <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                        {surveyAudienceLabels[survey.audienceType] || survey.audienceType}
                      </span>
                      {survey.isAnonymous ? (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                          مجهول الهوية
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-3 text-lg font-bold text-slate-950">{survey.title}</h3>
                    {survey.description ? <p className="mt-2 text-sm leading-7 text-slate-600">{survey.description}</p> : null}

                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>{survey._count?.questions || 0} سؤال</span>
                      <span>{survey._count?.responses || 0} رد</span>
                      <span>آخر تحديث: {new Date(survey.updatedAt).toLocaleDateString("ar-SA")}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <a
                      href={`${boardPath}/${survey.id}/analysis`}
                      className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-100"
                    >
                      التحليل
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
                    <button
                      type="button"
                      onClick={async () => {
                        const response = await fetch(`/api/dashboard/surveys/${survey.id}/duplicate`, {
                          method: "POST",
                        });

                        const data = await response.json().catch(() => null);

                        if (!response.ok) {
                          window.alert(data?.error || "تعذر نسخ الاستبيان.");
                          return;
                        }

                        window.location.href = `${boardPath}/${data.survey.id}/edit`;
                      }}
                      className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-100"
                    >
                      نسخ
                    </button>
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
                          onClick={() => updateSurveyStatus(survey.id, "publish")}
                          className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                        >
                          نشر
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSurvey(survey.id)}
                          className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-50"
                        >
                          حذف
                        </button>
                      </>
                    ) : null}

                    {survey.status === "PUBLISHED" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => copySurveyLink(survey.token)}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                        >
                          نسخ الرابط
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSurveyStatus(survey.id, "close")}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          إغلاق
                        </button>
                      </>
                    ) : null}

                    {survey.status !== "ARCHIVED" ? (
                      <button
                        type="button"
                        onClick={() => updateSurveyStatus(survey.id, "archive")}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                      >
                        أرشفة
                      </button>
                    ) : null}
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