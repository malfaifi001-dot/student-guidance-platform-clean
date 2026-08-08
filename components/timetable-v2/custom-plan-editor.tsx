"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  normalizeTimetableV2PlanText,
  normalizeTimetableV2SubjectKey,
  validateTimetableV2CustomCurriculumItems,
  type CustomCurriculumItemInput,
  type SubjectBankEntry,
  type TimetableV2SemesterId,
  type TimetableV2StageId,
} from "@/lib/timetable-v2";

export type CustomPlanDraft = {
  name: string;
  templateId: string | null;
  saved: boolean;
  saveForFuture: boolean;
  items: CustomCurriculumItemInput[];
};

type CustomPlanEditorProps = {
  draft: CustomPlanDraft;
  stageId: TimetableV2StageId;
  gradeId: string;
  semester: TimetableV2SemesterId;
  subjects: SubjectBankEntry[];
  subjectsLoading: boolean;

  onDraftChange: (
    next: CustomPlanDraft,
  ) => void;

  onClose: () => void;

  onAddSubject: (
    name: string,
  ) => Promise<SubjectBankEntry>;

  onSaveForFuture: (
    payload: {
      name: string;
      templateId: string | null;
      stageId: TimetableV2StageId | null;
      gradeId: string | null;
      semesterId: TimetableV2SemesterId | null;
      items: CustomCurriculumItemInput[];
    },
  ) => Promise<{
    templateId: string;
  }>;
};

type BankStage =
  | "ALL"
  | TimetableV2StageId;

const fieldClasses =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-950";

const STAGE_OPTIONS: Array<{
  id: BankStage;
  label: string;
}> = [
  {
    id: "ALL",
    label: "الكل",
  },
  {
    id: "ELEMENTARY",
    label: "ابتدائي",
  },
  {
    id: "MIDDLE",
    label: "متوسط",
  },
  {
    id: "HIGH",
    label: "ثانوي",
  },
];

function itemLabel(
  count: number,
) {
  if (count === 1) {
    return "مادة واحدة";
  }

  if (count === 2) {
    return "مادتان";
  }

  if (
    count >= 3 &&
    count <= 10
  ) {
    return `${count} مواد`;
  }

  return `${count} مادة`;
}

export function TimetableV2CustomPlanEditor({
  draft,
  stageId,
  gradeId,
  semester,
  subjects,
  subjectsLoading,
  onDraftChange,
  onClose,
  onAddSubject,
  onSaveForFuture,
}: CustomPlanEditorProps) {
  const [
    bankOpen,
    setBankOpen,
  ] = useState(false);

  const [
    bankStage,
    setBankStage,
  ] = useState<BankStage>(
    stageId,
  );

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    pendingKeys,
    setPendingKeys,
  ] = useState<
    Set<string>
  >(
    new Set(),
  );

  const [
    newSubject,
    setNewSubject,
  ] = useState("");

  const [
    feedback,
    setFeedback,
  ] = useState<{
    tone:
      | "error"
      | "success";
    message: string;
  } | null>(null);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    addingSubject,
    setAddingSubject,
  ] = useState(false);

  const validation =
    useMemo(
      () =>
        validateTimetableV2CustomCurriculumItems(
          draft.items,
        ),
      [draft.items],
    );

  const normalizedItemKeys =
    useMemo(
      () =>
        new Set(
          draft.items.map(
            (item) =>
              normalizeTimetableV2SubjectKey(
                item.subjectName ?? "",
              ),
          ),
        ),
      [draft.items],
    );

  const filteredSubjects =
    useMemo(() => {
      const query =
        normalizeTimetableV2SubjectKey(
          search,
        );

      return subjects.filter(
        (subject) => {
          const stageMatches =
            bankStage === "ALL" ||
            !subject.isSystem ||
            (
              subject.stageIds ??
              []
            ).includes(
              bankStage,
            );

          if (!stageMatches) {
            return false;
          }

          if (!query) {
            return true;
          }

          return normalizeTimetableV2SubjectKey(
            subject.name,
          ).includes(
            query,
          );
        },
      );
    }, [
      bankStage,
      search,
      subjects,
    ]);

  const pendingSubjects =
    useMemo(
      () =>
        subjects.filter(
          (subject) =>
            pendingKeys.has(
              subject.key,
            ),
        ),
      [
        pendingKeys,
        subjects,
      ],
    );

  const openBank = () => {
    setBankStage(
      stageId,
    );

    setSearch("");
    setPendingKeys(
      new Set(),
    );
    setNewSubject("");
    setFeedback(null);
    setBankOpen(true);
  };

  const closeBank = () => {
    setBankOpen(false);
    setPendingKeys(
      new Set(),
    );
    setSearch("");
    setNewSubject("");
  };

  const togglePending =
    (
      subject: SubjectBankEntry,
    ) => {
      const alreadyAdded =
        normalizedItemKeys.has(
          normalizeTimetableV2SubjectKey(
            subject.name,
          ),
        );

      if (alreadyAdded) {
        return;
      }

      setPendingKeys(
        (current) => {
          const next =
            new Set(current);

          if (
            next.has(
              subject.key,
            )
          ) {
            next.delete(
              subject.key,
            );
          } else {
            next.add(
              subject.key,
            );
          }

          return next;
        },
      );
    };

  const appendSubjects =
    (
      entries:
        SubjectBankEntry[],
    ) => {
      const existing =
        new Set(
          draft.items.map(
            (item) =>
              normalizeTimetableV2SubjectKey(
                item.subjectName,
              ),
          ),
        );

      const additions:
        CustomCurriculumItemInput[] =
        [];

      for (
        const entry of
        entries
      ) {
        const subjectName =
          normalizeTimetableV2PlanText(
            entry.name,
          );

        const key =
          normalizeTimetableV2SubjectKey(
            subjectName,
          );

        if (
          !subjectName ||
          existing.has(key)
        ) {
          continue;
        }

        if (
          draft.items.length +
            additions.length >=
          60
        ) {
          break;
        }

        existing.add(key);

        additions.push({
          subjectName,
          weeklyLessons: 2,
          singlePeriods: 2,
          doublePeriods: 0,
        });
      }

      if (
        additions.length === 0
      ) {
        return;
      }

      onDraftChange({
        ...draft,
        items: [
          ...draft.items,
          ...additions,
        ],
        saved: false,
      });

      setFeedback(null);
    };

  const confirmBankSelection =
    () => {
      if (
        pendingSubjects.length ===
        0
      ) {
        return;
      }

      appendSubjects(
        pendingSubjects,
      );

      setBankOpen(false);
      setPendingKeys(
        new Set(),
      );
      setSearch("");
      setNewSubject("");
    };

  const handleAddNewSubject =
    async () => {
      if (addingSubject) {
        return;
      }

      const name =
        normalizeTimetableV2PlanText(
          newSubject,
        );

      if (!name) {
        setFeedback({
          tone: "error",
          message:
            "أدخل اسم المادة أولًا.",
        });
        return;
      }

      setAddingSubject(true);
      setFeedback(null);

      try {
        const entry =
          await onAddSubject(
            name,
          );

        const alreadyAdded =
          normalizedItemKeys.has(
            normalizeTimetableV2SubjectKey(
              entry.name,
            ),
          );

        if (!alreadyAdded) {
          setPendingKeys(
            (current) => {
              const next =
                new Set(
                  current,
                );

              next.add(
                entry.key,
              );

              return next;
            },
          );
        }

        setNewSubject("");
      } catch (error) {
        setFeedback({
          tone: "error",
          message:
            error instanceof Error
              ? error.message
              : "تعذر إضافة المادة.",
        });
      } finally {
        setAddingSubject(false);
      }
    };

  const updateItem = (
    index: number,
    patch: Partial<CustomCurriculumItemInput>,
  ) => {
    onDraftChange({
      ...draft,
      saved: false,

      items:
        draft.items.map(
          (
            item,
            itemIndex,
          ) =>
            itemIndex === index
              ? {
                  ...item,
                  ...patch,
                }
              : item,
        ),
    });

    setFeedback(null);
  };

  const updateSinglePeriods =
    (
      index: number,
      value: number,
    ) => {
      const item =
        draft.items[
          index
        ];

      if (!item) {
        return;
      }

      const singlePeriods =
        Math.max(
          0,
          Math.min(
            60,
            value,
          ),
        );

      updateItem(
        index,
        {
          singlePeriods,
          weeklyLessons:
            singlePeriods +
            item.doublePeriods *
              2,
        },
      );
    };

  const updateDoublePeriods =
    (
      index: number,
      value: number,
    ) => {
      const item =
        draft.items[
          index
        ];

      if (!item) {
        return;
      }

      const doublePeriods =
        Math.max(
          0,
          Math.min(
            30,
            value,
          ),
        );

      updateItem(
        index,
        {
          doublePeriods,
          weeklyLessons:
            item.singlePeriods +
            doublePeriods * 2,
        },
      );
    };

  const removeItem = (
    index: number,
  ) => {
    onDraftChange({
      ...draft,
      saved: false,

      items:
        draft.items.filter(
          (
            _,
            itemIndex,
          ) =>
            itemIndex !==
            index,
        ),
    });

    setFeedback(null);
  };

  const handleSaveForFuture =
    async () => {
      if (saving) {
        return;
      }

      if (
        !validation.valid
      ) {
        setFeedback({
          tone: "error",
          message:
            validation.errors[
              0
            ] ??
            "تحقق من بيانات الخطة قبل الحفظ.",
        });

        return;
      }

      const name =
        normalizeTimetableV2PlanText(
          draft.name,
        );

      if (!name) {
        setFeedback({
          tone: "error",
          message:
            "أدخل اسمًا للخطة الدراسية حتى يمكن حفظها.",
        });

        return;
      }

      setSaving(true);
      setFeedback(null);

      try {
        const result =
          await onSaveForFuture({
            name,

            templateId:
              draft.templateId,

            stageId:
              stageId ??
              null,

            gradeId:
              gradeId ??
              null,

            semesterId:
              stageId ===
              "HIGH"
                ? semester
                : null,

            items:
              draft.items,
          });

        onDraftChange({
          ...draft,
          name,

          templateId:
            result.templateId,

          saved: true,
          saveForFuture: true,
        });

        setFeedback({
          tone: "success",
          message:
            "تم حفظ الخطة لاستخدامها في مشاريع قادمة.",
        });
      } catch (error) {
        setFeedback({
          tone: "error",
          message:
            error instanceof Error
              ? error.message
              : "تعذر حفظ الخطة.",
        });
      } finally {
        setSaving(false);
      }
    };

  const totalWeeklyLessons =
    useMemo(
      () =>
        draft.items.reduce(
          (
            total,
            item,
          ) =>
            total +
            item.weeklyLessons,
          0,
        ),
      [draft.items],
    );

  return (
    <>
      <div className="mt-3 rounded-[2rem] border border-sky-200 bg-sky-50/60 p-5 dark:border-sky-900/70 dark:bg-sky-950/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-black text-sky-900 dark:text-sky-100">
                إنشاء خطة دراسية مخصصة
              </span>

              <span className="rounded-full bg-sky-600 px-2.5 py-1 text-[10px] font-black text-white dark:bg-sky-500">
                مخصصة
              </span>
            </div>

            <p className="mt-1 max-w-2xl text-xs font-bold leading-6 text-slate-600 dark:text-slate-300">
              اختر مواد الخطة من البنك، ثم عدّل توزيع الحصص لكل مادة.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            إلغاء
          </button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="space-y-2">
            <span className="block text-xs font-black text-slate-700 dark:text-slate-200">
              اسم الخطة
            </span>

            <input
              value={
                draft.name
              }
              onChange={(
                event,
              ) =>
                onDraftChange({
                  ...draft,
                  name:
                    event.target
                      .value,
                  saved: false,
                })
              }
              placeholder="مثال: خطة ثالث متوسط المخصصة"
              maxLength={120}
              className={[
                fieldClasses,
                "w-full",
              ].join(" ")}
            />
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={
                handleSaveForFuture
              }
              disabled={
                saving ||
                subjectsLoading
              }
              className={[
                "inline-flex h-10 items-center justify-center rounded-xl px-5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50",
                draft.saved
                  ? "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-sky-700 text-white hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500",
              ].join(" ")}
            >
              {saving
                ? "جاري الحفظ..."
                : draft.saved
                  ? "تحديث الخطة المحفوظة"
                  : "حفظ الخطة لاستخدامها مستقبلًا"}
            </button>
          </div>
        </div>

        <section className="mt-5 rounded-[1.75rem] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-black text-slate-950 dark:text-white">
                بنك المواد
              </div>

              <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                اختر عدة مواد دفعة واحدة من المقررات المتوفرة.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {itemLabel(
                  draft.items
                    .length,
                )}
              </span>

              <button
                type="button"
                onClick={
                  openBank
                }
                disabled={
                  subjectsLoading
                }
                className="h-10 rounded-xl bg-slate-950 px-5 text-xs font-black text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
              >
                {subjectsLoading
                  ? "جاري تحميل البنك..."
                  : "فتح بنك المواد"}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                المواد المختارة
              </h4>

              <p className="mt-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                عدّل المفردة والمتتالية، وسيحسب الإجمالي الأسبوعي تلقائيًا.
              </p>
            </div>

            <div className="flex gap-2">
              <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-black text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                {draft.items.length} مواد
              </span>

              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                {totalWeeklyLessons} حصة
              </span>
            </div>
          </div>

          {draft.items.length ===
          0 ? (
            <div className="px-4 py-10 text-center">
              <div className="text-sm font-black text-slate-600 dark:text-slate-300">
                لم تُختر مواد بعد
              </div>

              <button
                type="button"
                onClick={
                  openBank
                }
                className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-black text-sky-700 transition hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300"
              >
                فتح بنك المواد
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="bg-slate-50 text-[11px] text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-right">
                      المادة
                    </th>

                    <th className="px-3 py-3 text-center">
                      مفردة
                    </th>

                    <th className="px-3 py-3 text-center">
                      متتالية
                    </th>

                    <th className="px-3 py-3 text-center">
                      أسبوعيًا
                    </th>

                    <th className="px-3 py-3 text-center">
                      الإجراء
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {draft.items.map(
                    (
                      item,
                      index,
                    ) => (
                      <tr
                        key={`${index}-${item.subjectName}`}
                        className="border-t border-slate-100 dark:border-slate-800"
                      >
                        <td className="px-4 py-2.5">
                          <input
                            value={
                              item.subjectName
                            }
                            onChange={(
                              event,
                            ) =>
                              updateItem(
                                index,
                                {
                                  subjectName:
                                    event
                                      .target
                                      .value,
                                },
                              )
                            }
                            aria-label="اسم المادة"
                            className={[
                              fieldClasses,
                              "w-full min-w-40",
                            ].join(" ")}
                          />
                        </td>

                        <td className="px-3 py-2.5 text-center">
                          <input
                            type="number"
                            min={0}
                            max={60}
                            value={
                              item.singlePeriods
                            }
                            onChange={(
                              event,
                            ) =>
                              updateSinglePeriods(
                                index,
                                Number(
                                  event
                                    .target
                                    .value,
                                ) ||
                                  0,
                              )
                            }
                            aria-label="الحصص المفردة"
                            className={[
                              fieldClasses,
                              "w-20 text-center",
                            ].join(" ")}
                          />
                        </td>

                        <td className="px-3 py-2.5 text-center">
                          <input
                            type="number"
                            min={0}
                            max={30}
                            value={
                              item.doublePeriods
                            }
                            onChange={(
                              event,
                            ) =>
                              updateDoublePeriods(
                                index,
                                Number(
                                  event
                                    .target
                                    .value,
                                ) ||
                                  0,
                              )
                            }
                            aria-label="الحصص المتتالية"
                            className={[
                              fieldClasses,
                              "w-20 text-center",
                            ].join(" ")}
                          />
                        </td>

                        <td className="px-3 py-2.5 text-center font-black text-sky-700 dark:text-sky-300">
                          {
                            item.weeklyLessons
                          }
                        </td>

                        <td className="px-3 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              removeItem(
                                index,
                              )
                            }
                            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-black text-rose-700 transition hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
                          >
                            إزالة
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {!validation.valid &&
        draft.items.length >
          0 ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold leading-6 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            {validation.errors[0]}
          </div>
        ) : null}

        {feedback ? (
          <div
            className={[
              "mt-3 rounded-xl border px-4 py-3 text-xs font-bold leading-6",
              feedback.tone ===
              "error"
                ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
            ].join(" ")}
          >
            {
              feedback.message
            }
          </div>
        ) : null}
      </div>

      {bankOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm md:items-center"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeBank();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="بنك المواد"
            className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950"
          >
            <header className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-950 dark:text-white">
                    بنك المواد
                  </h3>

                  <p className="mt-1 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">
                    اختر المواد التي تريد إضافتها إلى الخطة ثم اضغط «إضافة المواد المحددة».
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeBank
                  }
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-black text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  aria-label="إغلاق بنك المواد"
                >
                  ×
                </button>
              </div>

              <div className="mt-4">
                <input
                  autoFocus
                  value={
                    search
                  }
                  onChange={(
                    event,
                  ) =>
                    setSearch(
                      event.target
                        .value,
                    )
                  }
                  placeholder="ابحث سريعًا باسم المادة..."
                  className={[
                    fieldClasses,
                    "w-full",
                  ].join(" ")}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {STAGE_OPTIONS.map(
                  (option) => {
                    const active =
                      bankStage ===
                      option.id;

                    return (
                      <button
                        key={
                          option.id
                        }
                        type="button"
                        onClick={() =>
                          setBankStage(
                            option.id,
                          )
                        }
                        className={[
                          "rounded-xl px-4 py-2 text-xs font-black transition",
                          active
                            ? "bg-sky-700 text-white shadow-sm"
                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
                        ].join(" ")}
                      >
                        {
                          option.label
                        }
                      </button>
                    );
                  },
                )}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-5">
              {subjectsLoading ? (
                <div className="py-14 text-center text-sm font-bold text-slate-400">
                  جاري تحميل بنك المواد...
                </div>
              ) : filteredSubjects.length ===
                0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-700 dark:bg-slate-900">
                  <div className="font-black text-slate-700 dark:text-slate-200">
                    لا توجد مواد مطابقة
                  </div>

                  <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                    جرّب بحثًا آخر أو أضف مادة جديدة.
                  </div>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredSubjects.map(
                    (
                      subject,
                    ) => {
                      const alreadyAdded =
                        normalizedItemKeys.has(
                          normalizeTimetableV2SubjectKey(
                            subject.name,
                          ),
                        );

                      const selected =
                        pendingKeys.has(
                          subject.key,
                        );

                      return (
                        <button
                          key={
                            subject.key
                          }
                          type="button"
                          disabled={
                            alreadyAdded
                          }
                          onClick={() =>
                            togglePending(
                              subject,
                            )
                          }
                          className={[
                            "flex min-h-16 items-center justify-between gap-3 rounded-2xl border p-3 text-right transition",
                            alreadyAdded
                              ? "cursor-not-allowed border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30"
                              : selected
                                ? "border-sky-500 bg-sky-50 ring-2 ring-sky-100 dark:border-sky-500 dark:bg-sky-950/40 dark:ring-sky-900"
                                : "border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-sky-700 dark:hover:bg-sky-950/20",
                          ].join(" ")}
                        >
                          <div className="min-w-0">
                            <div
                              className={[
                                "truncate text-sm font-black",
                                alreadyAdded
                                  ? "text-emerald-700 dark:text-emerald-300"
                                  : "text-slate-900 dark:text-slate-100",
                              ].join(" ")}
                            >
                              {
                                subject.name
                              }
                            </div>

                            <div className="mt-1 text-[10px] font-bold text-slate-400">
                              {subject.isSystem
                                ? "من مقررات النظام"
                                : "من مواد مدرستك"}
                            </div>
                          </div>

                          <span
                            className={[
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-black",
                              alreadyAdded
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : selected
                                  ? "border-sky-600 bg-sky-600 text-white"
                                  : "border-slate-300 bg-white text-transparent dark:border-slate-600 dark:bg-slate-950",
                            ].join(" ")}
                          >
                            ✓
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
              )}

              <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  مادة غير موجودة؟
                </div>

                <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                  أضفها إلى بنك مدرستك وستبقى متاحة مستقبلًا.
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={
                      newSubject
                    }
                    onChange={(
                      event,
                    ) =>
                      setNewSubject(
                        event.target
                          .value,
                      )
                    }
                    onKeyDown={(
                      event,
                    ) => {
                      if (
                        event.key ===
                        "Enter"
                      ) {
                        event.preventDefault();
                        void handleAddNewSubject();
                      }
                    }}
                    placeholder="اسم المادة الجديدة"
                    maxLength={120}
                    className={[
                      fieldClasses,
                      "flex-1",
                    ].join(" ")}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      void handleAddNewSubject()
                    }
                    disabled={
                      addingSubject
                    }
                    className="h-10 rounded-xl bg-slate-950 px-5 text-xs font-black text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950"
                  >
                    {addingSubject
                      ? "جاري الإضافة..."
                      : "إضافة مادة جديدة"}
                  </button>
                </div>
              </div>
            </div>

            <footer className="border-t border-slate-100 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-black text-slate-700 dark:text-slate-200">
                  تم تحديد{" "}
                  <span className="text-sky-700 dark:text-sky-300">
                    {
                      pendingKeys.size
                    }
                  </span>{" "}
                  مادة
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={
                      closeBank
                    }
                    className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  >
                    إلغاء
                  </button>

                  <button
                    type="button"
                    disabled={
                      pendingKeys.size ===
                      0
                    }
                    onClick={
                      confirmBankSelection
                    }
                    className="h-11 rounded-xl bg-sky-700 px-6 text-sm font-black text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-sky-600 dark:hover:bg-sky-500"
                  >
                    إضافة المواد المحددة
                  </button>
                </div>
              </div>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}