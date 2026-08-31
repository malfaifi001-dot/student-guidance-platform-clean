"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { surveyAudienceLabels, type SurveyBoardRole } from "@/lib/surveys/survey-config";
import { surveyTemplates } from "@/lib/surveys/survey-templates";

type SurveyTemplatesShellProps = {
  ownerRole: SurveyBoardRole;
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
  const router = useRouter();
  const [isCreatingKey, setIsCreatingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

    const responseText = await response.text();
    const data = (() => {
      try {
        return JSON.parse(responseText);
      } catch {
        return null;
      }
    })();

    setIsCreatingKey(null);

    if (!response.ok) {
      const returnedError =
        typeof data?.error === "string"
          ? data.error
          : responseText && !responseText.trimStart().startsWith("<")
            ? responseText
            : `تعذر إنشاء المسودة من القالب (رمز الاستجابة ${response.status}).`;

      setError(returnedError);
      return;
    }

    if (mode === "edit") {
      router.push(`${boardPath}/${data.survey.id}/edit`);
      return;
    }

    setFeedback("تم إنشاء المسودة من القالب. سيتم نقلك إلى مركز الاستبيانات.");
    window.setTimeout(() => {
      router.push(boardPath);
    }, 700);
  }

  return (
    <div className="space-y-4 text-slate-950 dark:text-slate-100" dir="rtl">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Link href={boardPath} className="text-sm font-bold text-sky-700">
          العودة إلى مركز الاستبيانات
        </Link>

        <div className="mt-4">
          <div>
            <h1 className="text-xl font-bold text-slate-950 dark:text-white">قوالب الاستبيانات الجاهزة</h1>
            <p className="mt-1 max-w-3xl text-xs leading-6 text-slate-600 dark:text-slate-400">
              القالب لا يُنشر مباشرة. اختر تعديل لإنشاء نسخة مسودة وفتحها للتعديل، أو إنشاء مسودة لإضافتها إلى مركز الاستبيانات.
            </p>
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

      <section className="grid gap-4 lg:grid-cols-2">
        {surveyTemplates.map((template) => (
          <article
            key={template.key}
            className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
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
              <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">{template.description}</p>

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
