"use client";

import {
  useState,
} from "react";

import type {
  TimetableAiImportResult,
} from "@/lib/timetable-v3/ai-import/ai-import-types";

type Props = {
  projectId: string;
  onClose: () => void;
  onApply: (
    result: TimetableAiImportResult,
  ) => void;
};

type AnalyzeResponse = {
  ok?: boolean;
  error?: string;
  result?: TimetableAiImportResult;
};

export function TimetableV3SmartImportPanel(
  {
    projectId,
    onClose,
    onApply,
  }: Props,
) {
  const [
    sourceText,
    setSourceText,
  ] = useState(
    "",
  );

  const [
    analyzing,
    setAnalyzing,
  ] = useState(
    false,
  );

  const [
    error,
    setError,
  ] = useState<
    string |
    null
  >(
    null,
  );

  const [
    result,
    setResult,
  ] = useState<
    TimetableAiImportResult |
    null
  >(
    null,
  );

  async function analyze() {
    const text =
      sourceText.trim();

    if (!text) {
      setError(
        "ألصق بيانات الجدول أولًا.",
      );

      return;
    }

    setAnalyzing(
      true,
    );

    setError(
      null,
    );

    setResult(
      null,
    );

    try {
      const response =
        await fetch(
          `/api/dashboard/principal/timetable-v3/projects/${projectId}/ai-import/analyze`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                sourceText:
                  text,
              }),
          },
        );

      const data =
        await response.json() as AnalyzeResponse;

      if (
        !response.ok ||
        !data.ok ||
        !data.result
      ) {
        throw new Error(
          data.error ??
          "تعذر تحليل البيانات.",
        );
      }

      setResult(
        data.result,
      );
    }
    catch (
      cause
    ) {
      setError(
        cause instanceof Error
          ? cause.message
          : "تعذر تحليل البيانات.",
      );
    }
    finally {
      setAnalyzing(
        false,
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div
        dir="rtl"
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              الاستيراد الذكي
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              ألصق بيانات المدرسة وسيقوم تيتش اكس بتنظيمها قبل تطبيقها.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-lg text-slate-500 transition hover:bg-slate-200"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {!result ? (
            <>
              <label className="text-sm font-semibold text-slate-800">
                بيانات الجدول
              </label>

              <textarea
                value={
                  sourceText
                }
                onChange={
                  (
                    event,
                  ) =>
                    setSourceText(
                      event.target.value,
                    )
                }
                placeholder={`مثال:
لدينا المرحلة الثانوية، 12 فصلًا و40 معلمًا.
الأستاذ أحمد يدرس الرياضيات للصف الأول الثانوي أ بواقع 5 حصص أسبوعيًا.
الأستاذ محمد غير متاح يوم الثلاثاء الحصة الأولى.`}
                className="mt-2 min-h-64 w-full resize-y rounded-2xl border border-slate-200 p-4 text-sm leading-7 outline-none transition focus:border-[#3478B8]"
              />

              <div className="mt-2 text-xs text-slate-400">
                لن يتم حفظ أي شيء قبل مراجعتك وموافقتك.
              </div>
            </>
          ) : (
            <ImportPreview
              result={
                result
              }
            />
          )}

          {error ? (
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {
                error
              }
            </div>
          ) : null}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 sm:px-6">
          <button
            type="button"
            onClick={
              result
                ? () => {
                    setResult(
                      null,
                    );

                    setError(
                      null,
                    );
                  }
                : onClose
            }
            className="h-11 rounded-xl px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            {result
              ? "تعديل النص"
              : "إلغاء"}
          </button>

          {!result ? (
            <button
              type="button"
              disabled={
                analyzing ||
                !sourceText.trim()
              }
              onClick={
                () =>
                  void analyze()
              }
              className="h-11 rounded-xl bg-[#3478B8] px-6 text-sm font-semibold text-white transition hover:bg-[#2D6BA5] disabled:opacity-40"
            >
              {analyzing
                ? "جاري التحليل..."
                : "تحليل البيانات"}
            </button>
          ) : (
            <button
              type="button"
              onClick={
                () =>
                  onApply(
                    result,
                  )
              }
              className="h-11 rounded-xl bg-[#3478B8] px-6 text-sm font-semibold text-white transition hover:bg-[#2D6BA5]"
            >
              تطبيق على إعداد المشروع
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function ImportPreview(
  {
    result,
  }: {
    result:
      TimetableAiImportResult;
  },
) {
  const summary = [
    {
      label:
        "المراحل",
      value:
        result.stages.length,
    },
    {
      label:
        "الفصول",
      value:
        result.classes.length,
    },
    {
      label:
        "المواد",
      value:
        result.subjects.length,
    },
    {
      label:
        "المعلمون",
      value:
        result.teachers.length,
    },
    {
      label:
        "الإسنادات",
      value:
        result.assignments.length,
    },
    {
      label:
        "قيود مقترحة",
      value:
        result.constraintCandidates.length,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm font-semibold text-slate-500">
          نتيجة التحليل
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {summary.map(
            (
              item,
            ) => (
              <div
                key={
                  item.label
                }
                className="rounded-2xl bg-slate-50 p-4"
              >
                <div className="text-2xl font-bold text-slate-950">
                  {
                    item.value
                  }
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  {
                    item.label
                  }
                </div>
              </div>
            ),
          )}
        </div>
      </div>

      {result.stages.length ? (
        <PreviewSection
          title="المراحل"
        >
          <div className="flex flex-wrap gap-2">
            {result.stages.map(
              (
                stage,
              ) => (
                <span
                  key={
                    stage
                  }
                  className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700"
                >
                  {
                    stageLabel(
                      stage,
                    )
                  }
                </span>
              ),
            )}
          </div>
        </PreviewSection>
      ) : null}

      {result.classes.length ? (
        <PreviewSection
          title="الفصول"
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {result.classes.map(
              (
                item,
                index,
              ) => (
                <PreviewItem
                  key={
                    `${item.name}-${index}`
                  }
                  title={
                    item.name
                  }
                  detail={[
                    item.grade,
                    item.stage
                      ? stageLabel(
                          item.stage,
                        )
                      : null,
                  ]
                    .filter(
                      Boolean,
                    )
                    .join(
                      " · ",
                    )}
                  confidence={
                    item.confidence
                  }
                />
              ),
            )}
          </div>
        </PreviewSection>
      ) : null}

      {result.subjects.length ? (
        <PreviewSection
          title="المواد"
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {result.subjects.map(
              (
                item,
                index,
              ) => (
                <PreviewItem
                  key={
                    `${item.name}-${index}`
                  }
                  title={
                    item.name
                  }
                  detail={
                    item.weeklyLessons
                      ? `${item.weeklyLessons} حصة أسبوعيًا`
                      : ""
                  }
                  confidence={
                    item.confidence
                  }
                />
              ),
            )}
          </div>
        </PreviewSection>
      ) : null}

      {result.teachers.length ? (
        <PreviewSection
          title="المعلمون"
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {result.teachers.map(
              (
                item,
                index,
              ) => (
                <PreviewItem
                  key={
                    `${item.name}-${index}`
                  }
                  title={
                    item.name
                  }
                  detail={[
                    item.specialty,
                    item.maxWeeklyLoad
                      ? `النصاب الأقصى ${item.maxWeeklyLoad}`
                      : null,
                  ]
                    .filter(
                      Boolean,
                    )
                    .join(
                      " · ",
                    )}
                  confidence={
                    item.confidence
                  }
                />
              ),
            )}
          </div>
        </PreviewSection>
      ) : null}

      {result.assignments.length ? (
        <PreviewSection
          title="الإسنادات المستخرجة"
        >
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="max-h-72 overflow-auto">
              <table className="w-full min-w-[680px] text-right text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3">
                      المعلم
                    </th>
                    <th className="px-4 py-3">
                      المادة
                    </th>
                    <th className="px-4 py-3">
                      الفصل
                    </th>
                    <th className="px-4 py-3">
                      الحصص
                    </th>
                    <th className="px-4 py-3">
                      الثقة
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {result.assignments.map(
                    (
                      item,
                      index,
                    ) => (
                      <tr
                        key={
                          index
                        }
                        className="border-t border-slate-100"
                      >
                        <td className="px-4 py-3">
                          {
                            item.teacherName
                          }
                        </td>
                        <td className="px-4 py-3">
                          {
                            item.subjectName
                          }
                        </td>
                        <td className="px-4 py-3">
                          {
                            item.className
                          }
                        </td>
                        <td className="px-4 py-3">
                          {
                            item.weeklyLessons ??
                            "غير محدد"
                          }
                        </td>
                        <td className="px-4 py-3">
                          <ConfidenceBadge
                            value={
                              item.confidence
                            }
                          />
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-2 text-xs text-slate-400">
            الإسنادات ظاهرة للمراجعة الآن، ولن تُحفظ تلقائيًا من هذه الخطوة.
          </p>
        </PreviewSection>
      ) : null}

      {result.constraintCandidates.length ? (
        <PreviewSection
          title="القيود والتعليمات المستخرجة"
        >
          <div className="space-y-2">
            {result.constraintCandidates.map(
              (
                item,
                index,
              ) => (
                <div
                  key={
                    index
                  }
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm leading-6 text-slate-800">
                      {
                        item.text
                      }
                    </p>

                    <ConfidenceBadge
                      value={
                        item.confidence
                      }
                    />
                  </div>

                  {item.suggestedType ? (
                    <div className="mt-2 text-xs text-slate-400">
                      اقتراح أولي:
                      {" "}
                      {
                        item.suggestedType
                      }
                    </div>
                  ) : null}
                </div>
              ),
            )}
          </div>

          <p className="mt-2 text-xs text-amber-600">
            لن يتم إنشاء أي قيد قبل مطابقته مع قيود تيتش اكس المعتمدة.
          </p>
        </PreviewSection>
      ) : null}

      {result.uncertainFields.length ? (
        <PreviewSection
          title="تحتاج تأكيد"
        >
          <div className="space-y-2">
            {result.uncertainFields.map(
              (
                item,
                index,
              ) => (
                <div
                  key={
                    index
                  }
                  className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900"
                >
                  <div className="font-semibold">
                    {item.entity}
                    {" — "}
                    {item.field}
                  </div>

                  <div className="mt-1 text-xs leading-5 text-amber-700">
                    {
                      item.reason
                    }
                  </div>
                </div>
              ),
            )}
          </div>
        </PreviewSection>
      ) : null}

      {result.warnings.length ? (
        <PreviewSection
          title="ملاحظات"
        >
          <ul className="space-y-2 text-sm text-slate-600">
            {result.warnings.map(
              (
                item,
                index,
              ) => (
                <li
                  key={
                    index
                  }
                  className="rounded-xl bg-slate-50 px-4 py-3"
                >
                  {
                    item
                  }
                </li>
              ),
            )}
          </ul>
        </PreviewSection>
      ) : null}
    </div>
  );
}

function PreviewSection(
  props: {
    title: string;
    children: React.ReactNode;
  },
) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-bold text-slate-900">
        {
          props.title
        }
      </h3>

      {
        props.children
      }
    </section>
  );
}

function PreviewItem(
  props: {
    title: string;
    detail?: string;
    confidence: number;
  },
) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">
            {
              props.title
            }
          </div>

          {props.detail ? (
            <div className="mt-1 text-xs text-slate-500">
              {
                props.detail
              }
            </div>
          ) : null}
        </div>

        <ConfidenceBadge
          value={
            props.confidence
          }
        />
      </div>
    </div>
  );
}

function ConfidenceBadge(
  {
    value,
  }: {
    value: number;
  },
) {
  const percent =
    Math.round(
      value *
      100,
    );

  const label =
    percent >= 85
      ? "مؤكد"
      : percent >= 60
        ? "راجع"
        : "غير مؤكد";

  const className =
    percent >= 85
      ? "bg-emerald-50 text-emerald-700"
      : percent >= 60
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-700";

  return (
    <span
      className={[
        "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        className,
      ].join(
        " ",
      )}
    >
      {label}
      {" "}
      {percent}%
    </span>
  );
}

function stageLabel(
  stage:
    "ELEMENTARY" |
    "MIDDLE" |
    "HIGH",
) {
  if (
    stage ===
    "ELEMENTARY"
  ) {
    return "ابتدائي";
  }

  if (
    stage ===
    "MIDDLE"
  ) {
    return "متوسط";
  }

  return "ثانوي";
}
