"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, MoreVertical, Send, Share2 } from "lucide-react";
import {
  surveyAudienceLabels,
  type SurveyBoardRole,
  type SurveyQuestionInputType,
} from "@/lib/surveys/survey-config";

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

type QuestionDraft = {
  label: string;
  type: SurveyQuestionInputType;
  isRequired: boolean;
  options: string[];
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

function getSurveyStatusLabel(status: SurveyListItem["status"]) {
  if (status === "DRAFT") return "مسودة";
  if (status === "PUBLISHED") return "منشور";
  if (status === "CLOSED") return "مغلق";
  return "مؤرشف";
}

function getSurveyStatusClass(status: SurveyListItem["status"]) {
  if (status === "DRAFT") return "bg-amber-50 text-amber-700 ring-amber-100";
  if (status === "PUBLISHED") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (status === "CLOSED") return "bg-slate-100 text-slate-700 ring-slate-200";
  return "bg-slate-200 text-slate-700 ring-slate-300";
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "غير محدد";
  }

  return date.toLocaleDateString("ar-SA-u-ca-gregory", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fromDatetimeLocal(value: string) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export function SurveyCenterShell({
  ownerRole,
  boardPath,
}: SurveyCenterShellProps) {
  const router = useRouter();
  const loadRequestIdRef = useRef(0);
  const [surveys, setSurveys] = useState<SurveyListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audienceType, setAudienceType] = useState("GENERAL");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [opensAt, setOpensAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    return {
      total: surveys.length,
      published: surveys.filter((survey) => survey.status === "PUBLISHED").length,
      drafts: surveys.filter((survey) => survey.status === "DRAFT").length,
      responses: surveys.reduce((sum, survey) => sum + (survey._count?.responses || 0), 0),
    };
  }, [surveys]);

  async function loadSurveys() {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;

    setIsLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);

    try {
      const params = new URLSearchParams({
        ownerRole,
        boardPath,
      });

      const response = await fetch(`/api/dashboard/surveys?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);

      if (loadRequestIdRef.current !== requestId) {
        return;
      }

      if (!response.ok) {
        setError(data?.error || "تعذر تحميل الاستبيانات.");
        setSurveys([]);
        return;
      }

      setSurveys(Array.isArray(data?.surveys) ? data.surveys : []);
    } catch {
      if (loadRequestIdRef.current !== requestId) {
        return;
      }

      setError("تعذر تحميل الاستبيانات.");
      setSurveys([]);
    } finally {
      window.clearTimeout(timeoutId);

      if (loadRequestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadSurveys();
  }, [ownerRole, boardPath]);

  useEffect(() => {
    function refreshOnReturn() {
      void loadSurveys();
    }

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void loadSurveys();
      }
    }

    window.addEventListener("pageshow", refreshOnReturn);
    window.addEventListener("dashboard:navigation-refresh", refreshOnReturn);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.removeEventListener("pageshow", refreshOnReturn);
      window.removeEventListener("dashboard:navigation-refresh", refreshOnReturn);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [ownerRole, boardPath]);

  function resetCreateForm() {
    setTitle("");
    setDescription("");
    setAudienceType("GENERAL");
    setIsAnonymous(false);
    setOpensAt("");
    setEndsAt("");
  }

  function openCreateModal() {
    setFeedback(null);
    setError(null);
    setIsCreateOpen(true);
  }

  function closeCreateModal() {
    if (isSaving) return;

    setIsCreateOpen(false);
    resetCreateForm();
  }

  async function handleCreateSurvey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving) return;

    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setError("اكتب عنوان الاستبيان أولًا.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setFeedback(null);

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

    setIsCreateOpen(false);
    resetCreateForm();
    router.push(`${boardPath}/${surveyId}/edit`);
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

    setFeedback(data?.message || "تم حذف مسودة الاستبيان.");
    await loadSurveys();
  }

  async function copySurveyLink(token: string) {
    const url = `${window.location.origin}/survey/${token}`;
    await navigator.clipboard.writeText(url);
    setFeedback("تم نسخ رابط الاستبيان.");
  }

  return (
    <div className="space-y-7" dir="rtl">
      <section className="overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-sky-800 via-cyan-700 to-sky-500 p-8 text-white shadow-xl">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <h1 className="text-4xl font-black">
              الاستبيانات
            </h1>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-black text-sky-800 transition hover:bg-sky-50"
            >
              + استبيان جديد
            </button>

            <a
              href={`${boardPath}/templates`}
              className="inline-flex items-center justify-center rounded-2xl border border-white/25 bg-white/15 px-6 py-3 text-sm font-black text-white transition hover:bg-white/20"
            >
              فتح القوالب
            </a>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="الاستبيانات" value={stats.total} />
        <Metric label="منشورة" value={stats.published} />
        <Metric label="مسودات" value={stats.drafts} />
        <Metric label="الردود" value={stats.responses} />
      </section>

      {feedback ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">
          {feedback}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black text-sky-700">السجلات</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              آخر الاستبيانات
            </h2>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
          >
            + استبيان جديد
          </button>
        </div>

        {isLoading ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm font-black text-slate-500">
            جاري تحميل الاستبيانات...
          </div>
        ) : null}

        {!isLoading && surveys.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm font-black text-slate-500">
            لا توجد استبيانات بعد.
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          {surveys.map((survey) => (
            <article
              key={survey.id}
              className="relative rounded-[2rem] border border-slate-200 bg-slate-50 p-5 shadow-sm"
            >
              <div className="absolute left-5 top-5 z-20 flex items-center gap-1.5">
                {survey.status === "DRAFT" ? (
                  <button
                    type="button"
                    onClick={() => void updateSurveyStatus(survey.id, "publish")}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-emerald-700 transition hover:border-emerald-200 hover:bg-emerald-50 focus-visible:border-emerald-300 focus-visible:bg-emerald-50 focus-visible:outline-none"
                    title="نشر"
                    aria-label="نشر"
                  >
                    <Send className="h-4.5 w-4.5" />
                  </button>
                ) : null}

                <a
                  href={`${boardPath}/${survey.id}/analysis`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-sky-700 transition hover:border-sky-200 hover:bg-sky-50 focus-visible:border-sky-300 focus-visible:bg-sky-50 focus-visible:outline-none"
                  title="تحليل"
                  aria-label="تحليل"
                >
                  <BarChart3 className="h-4.5 w-4.5" />
                </a>

                <a
                  href={`${boardPath}/${survey.id}/share`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-emerald-700 transition hover:border-emerald-200 hover:bg-emerald-50 focus-visible:border-emerald-300 focus-visible:bg-emerald-50 focus-visible:outline-none"
                  title="مشاركة"
                  aria-label="مشاركة"
                >
                  <Share2 className="h-4.5 w-4.5" />
                </a>

                <div className="group relative">
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:border-slate-300 focus-visible:bg-slate-50 focus-visible:outline-none"
                    title="المزيد"
                    aria-label="المزيد"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>

                  <div className="pointer-events-none invisible absolute left-0 top-12 z-30 w-44 translate-y-1 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 text-right opacity-0 shadow-xl transition-all duration-150 group-hover:pointer-events-auto group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                    <a
                      href={`${boardPath}/${survey.id}/responses`}
                      className="block rounded-xl px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                    >
                      الردود
                    </a>

                    {survey.status === "DRAFT" || survey.status === "PUBLISHED" ? (
                      <a
                        href={`${boardPath}/${survey.id}/edit`}
                        className="block rounded-xl px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                      >
                        {survey.status === "PUBLISHED" ? "تعديل الأسئلة" : "تعديل"}
                      </a>
                    ) : null}

                    {survey.status === "PUBLISHED" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void copySurveyLink(survey.token)}
                          className="block w-full rounded-xl px-3 py-2 text-right text-xs font-black text-slate-700 transition hover:bg-slate-50"
                        >
                          نسخ الرابط
                        </button>

                        <button
                          type="button"
                          onClick={() => void updateSurveyStatus(survey.id, "close")}
                          className="block w-full rounded-xl px-3 py-2 text-right text-xs font-black text-slate-700 transition hover:bg-slate-50"
                        >
                          إغلاق
                        </button>
                      </>
                    ) : null}

                    {survey.status !== "ARCHIVED" ? (
                      <button
                        type="button"
                        onClick={() => void updateSurveyStatus(survey.id, "archive")}
                        className="block w-full rounded-xl px-3 py-2 text-right text-xs font-black text-slate-700 transition hover:bg-slate-50"
                      >
                        أرشفة
                      </button>
                    ) : null}

                    {survey.status === "DRAFT" ? (
                      <button
                        type="button"
                        onClick={() => void deleteSurvey(survey.id)}
                        className="block w-full rounded-xl px-3 py-2 text-right text-xs font-black text-rose-700 transition hover:bg-rose-50"
                      >
                        حذف
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-black ring-1",
                        getSurveyStatusClass(survey.status),
                      ].join(" ")}
                    >
                      {getSurveyStatusLabel(survey.status)}
                    </span>

                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
                      {surveyAudienceLabels[survey.audienceType] || survey.audienceType}
                    </span>

                    {survey.isAnonymous ? (
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-100">
                        مجهول
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-4 text-xl font-black leading-8 text-slate-950">
                    {survey.title}
                  </h3>

                  <p className="mt-2 text-xs font-bold text-slate-500">
                    آخر تحديث: {formatDate(survey.updatedAt)}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-2 rounded-2xl bg-white p-3 text-sm font-black text-slate-600 md:grid-cols-2">
                <span>{survey._count?.questions || 0} سؤال</span>
                <span>{survey._count?.responses || 0} رد</span>
              </div>

            </article>
          ))}
        </div>
      </section>

      {isCreateOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center"
          onMouseDown={closeCreateModal}
        >
          <section
            className="w-full max-w-4xl rounded-[2.25rem] bg-white p-6 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-sky-700">استبيان جديد</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  بيانات الاستبيان
                </h2>
              </div>
            </div>

            <form onSubmit={handleCreateSurvey}>
              <div className="grid gap-5 lg:grid-cols-2">
                <label className="space-y-2 text-sm font-black text-slate-700">
                  <span>عنوان الاستبيان</span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white"
                    placeholder="مثال: قياس رضا أولياء الأمور"
                    autoFocus
                  />
                </label>

                <label className="space-y-2 text-sm font-black text-slate-700">
                  <span>الفئة المستهدفة</span>
                  <select
                    value={audienceType}
                    onChange={(event) => setAudienceType(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white"
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
                  className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white"
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
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-400 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white"
                  />
                </label>

                <label className="space-y-2 text-sm font-black text-slate-700">
                  <span>نهاية الردود</span>
                  <input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(event) => setEndsAt(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-400 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white"
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

              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "جاري الحفظ..." : "إنشاء المسودة"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </article>
  );
}
