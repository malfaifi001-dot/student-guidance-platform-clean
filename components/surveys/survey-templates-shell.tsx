"use client";

import { useState } from "react";
import Link from "next/link";
import { surveyAudienceLabels } from "@/lib/surveys/survey-config";
import { surveyTemplates } from "@/lib/surveys/survey-templates";

type SurveyTemplatesShellProps = {
  ownerRole: "ADMIN" | "COUNSELOR" | "ACTIVITY_LEADER";
  boardPath: string;
};

type CreateMode = "edit" | "draft";

const categoryLabels: Record<string, string> = {
  guidance: "إرشادي",
  activity: "نشاط",
  school: "مدرسي",
};

function audienceLabel(value: string) {
  return (surveyAudienceLabels as Record<string, string>)[value] || value;
}

export function SurveyTemplatesShell({ ownerRole, boardPath }: SurveyTemplatesShellProps) {
  const [category, setCategory] = useState("");
  const [isCreatingKey, setIsCreatingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredTemplates = category
    ? surveyTemplates.filter((template) => template.category === category)
    : surveyTemplates;

  async function createFromTemplate(templateKey: string, mode: CreateMode) {
    setIsCreatingKey(`${templateKey}:${mode}`);
    setFeedback(null);
    setError(null);

    const response = await fetch("/api/dashboard/surveys/templates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        templateKey,
        ownerRole,
        boardPath,
      }),
    });

    const data = await response.json().catch(() => null);

    setIsCreatingKey(null);

    if (!response.ok) {
      setError(data?.error || "تعذر إنشاء المسودة من القالب.");
      return;
    }

    if (mode === "edit") {
      window.location.href = `${boardPath}/${data.survey.id}/edit`;
      return;
    }

    setFeedback("تم إنشاء المسودة من القالب. سيتم نقلك إلى مركز الاستبيانات.");
    window.setTimeout(() => {
      window.location.href = boardPath;
    }, 700);
  }

  return (
    <div className="space-y-6" dir="rtl">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link href={boardPath} className="text-sm font-bold text-sky-700">
          العودة إلى مركز الاستبيانات
        </Link>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950">قوالب الاستبيانات الجاهزة</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
              القالب لا يُنشر مباشرة. اختر تعديل لإنشاء نسخة مسودة وفتحها للتعديل، أو إنشاء مسودة لإضافتها إلى مركز الاستبيانات.
            </p>
          </div>

          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>تصفية القوالب</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full min-w-56 rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
            >
              <option value="">كل القوالب</option>
              <option value="guidance">إرشادي</option>
              <option value="activity">نشاط</option>
              <option value="school">مدرسي</option>
            </select>
          </label>
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

      <section className="grid gap-4 lg:grid-cols-2">
        {filteredTemplates.map((template) => (
          <article
            key={template.key}
            className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                  {categoryLabels[template.category] || template.category}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {audienceLabel(template.audienceType)}
                </span>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                  {template.questions.length} سؤال
                </span>
              </div>

              <h2 className="mt-4 text-lg font-bold text-slate-950">{template.title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{template.description}</p>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">أمثلة من الأسئلة</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                  {template.questions.slice(0, 3).map((question) => (
                    <li key={question.label}>• {question.label}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => createFromTemplate(template.key, "edit")}
                disabled={isCreatingKey === `${template.key}:edit` || isCreatingKey === `${template.key}:draft`}
                className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-3 text-sm font-bold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingKey === `${template.key}:edit` ? "جاري الفتح..." : "تعديل"}
              </button>

              <button
                type="button"
                onClick={() => createFromTemplate(template.key, "draft")}
                disabled={isCreatingKey === `${template.key}:edit` || isCreatingKey === `${template.key}:draft`}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingKey === `${template.key}:draft` ? "جاري الإنشاء..." : "إنشاء مسودة"}
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}