"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  getCatalogForBuilder,
  getConstraintDefinition,
} from "@/lib/timetable-v2/constraint-catalog";

import {
  analyzeConstraintConflicts,
  effectiveSlotsForRule,
  slotKey,
  type AnalysisOptions,
  type ConstraintConflict,
} from "@/lib/timetable-v2/constraint-analysis";

import {
  ConstraintForm,
} from "@/components/timetable-v2/constraints/constraint-form";

import {
  ConstraintPopCard,
} from "@/components/timetable-v2/constraints/constraint-pop-card";

import {
  ConstraintReviewGrid,
} from "@/components/timetable-v2/constraints/constraint-review-grid";

import {
  ConstraintSummaryCard,
} from "@/components/timetable-v2/constraints/constraint-summary-card";

import {
  constraintToAnalysisRule,
  constraintToDraft,
} from "@/components/timetable-v2/constraints/helpers";

import type {
  ClassItem,
  Constraint,
  ConstraintDraft,
  DayItem,
  PeriodItem,
  Slot,
  Subject,
  Teacher,
} from "@/components/timetable-v2/constraints/types";

import { notifyTimetableHistoryUpdated } from "@/lib/timetable-v3/history/history-client";

type Props = {
  project: {
    id: string;
    name: string;
    academicYear: string;
    semester: string;
  };

  days: DayItem[];
  periods: PeriodItem[];
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassItem[];
  initialConstraints: Constraint[];
};

type CategoryKey =
  | "SCHOOL"
  | "TEACHER"
  | "SUBJECT"
  | "CLASS"
  | "FIXED";

type FormMode =
  | {
      mode: "create";
      initial: ConstraintDraft;
    }
  | {
      mode: "edit";
      constraint: Constraint;
    }
  | {
      mode: "copy";
      constraint: Constraint;
    };

const CATEGORY_ITEMS: Array<{
  key: CategoryKey;
  label: string;
  description: string;
}> = [
  {
    key:
      "SCHOOL",

    label:
      "المدرسة",

    description:
      "أيام وحصص المدرسة",
  },
  {
    key:
      "TEACHER",

    label:
      "المعلم",

    description:
      "توفر ونصاب المعلم",
  },
  {
    key:
      "SUBJECT",

    label:
      "المادة",

    description:
      "توزيع المواد",
  },
  {
    key:
      "CLASS",

    label:
      "الفصل",

    description:
      "احتياجات الفصول",
  },
  {
    key:
      "FIXED",

    label:
      "تثبيت",

    description:
      "حصة أو يوم ثابت",
  },
];

function matchesCategory(
  type: string,
  category:
    CategoryKey,
) {
  return type.startsWith(
    `${category}_`,
  );
}

function createDraft(
  type: string,
): ConstraintDraft {
  const definition =
    getConstraintDefinition(
      type,
    );

  return {
    type:
      definition.type,

    strength:
      definition.defaultStrength,

    notes:
      "",

    valueInt:
      null,

    weight:
      null,

    teacherIds:
      [],

    subjectIds:
      [],

    classIds:
      [],

    dayIds:
      [],

    periodIds:
      [],

    slots:
      [],
  };
}

export function TimetableV3ConstraintsWorkspace(
  {
    project,
    days,
    periods,
    teachers,
    subjects,
    classes,
    initialConstraints,
  }: Props,
) {
  const [
    constraints,
    setConstraints,
  ] = useState(
    initialConstraints,
  );

  const [
    formMode,
    setFormMode,
  ] = useState<
    FormMode |
    null
  >(
    null,
  );

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState<
    CategoryKey |
    null
  >(
    null,
  );

  const [
    search,
    setSearch,
  ] = useState(
    "",
  );

  const [
    mapOpen,
    setMapOpen,
  ] = useState(
    false,
  );

  const [
    issuesOpen,
    setIssuesOpen,
  ] = useState(
    true,
  );

  const [
    reviewSlot,
    setReviewSlot,
  ] = useState<
    Slot |
    null
  >(
    null,
  );

  const [
    busy,
    setBusy,
  ] = useState(
    false,
  );

  const [
    message,
    setMessage,
  ] = useState<{
    tone:
      | "success"
      | "error";

    text:
      string;
  } | null>(
    null,
  );

  const catalog =
    useMemo(
      () =>
        getCatalogForBuilder(),
      [],
    );

  const teachingPeriods =
    useMemo(
      () =>
        periods
          .filter(
            (period) =>
              !period.isBreak,
          )
          .sort(
            (a, b) =>
              a.order -
              b.order,
          ),
      [
        periods,
      ],
    );

  const analysisOptions =
    useMemo<AnalysisOptions>(
      () => ({
        dayIds:
          days.map(
            (day) =>
              day.id,
          ),

        periodIds:
          teachingPeriods.map(
            (period) =>
              period.id,
          ),
      }),
      [
        days,
        teachingPeriods,
      ],
    );

  const analysisRules =
    useMemo(
      () =>
        constraints
          .filter(
            (constraint) =>
              constraint.isActive,
          )
          .map(
            constraintToAnalysisRule,
          ),
      [
        constraints,
      ],
    );

  const conflicts =
    useMemo(
      () =>
        analyzeConstraintConflicts(
          analysisRules,
          analysisOptions,
        ),
      [
        analysisRules,
        analysisOptions,
      ],
    );

  const conflictMap =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            ConstraintConflict[]
          >();

        for (
          const conflict of
          conflicts
        ) {
          for (
            const slot of
            conflict.slots
          ) {
            const key =
              slotKey(
                slot.dayId,
                slot.periodId,
              );

            const current =
              map.get(
                key,
              ) ??
              [];

            current.push(
              conflict,
            );

            map.set(
              key,
              current,
            );
          }
        }

        return map;
      },
      [
        conflicts,
      ],
    );

  const categoryDefinitions =
    selectedCategory
      ? catalog.filter(
          (definition) =>
            matchesCategory(
              definition.type,
              selectedCategory,
            ),
        )
      : [];

  const filteredConstraints =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLocaleLowerCase(
              "ar",
            );

        if (!query) {
          return constraints;
        }

        return constraints.filter(
          (constraint) => {
            const definition =
              getConstraintDefinition(
                constraint.type,
              );

            const text = [
              definition.label,
              definition.description,

              ...constraint.teachers.map(
                (link) =>
                  link.teacher.name,
              ),

              ...constraint.subjects.map(
                (link) =>
                  link.subject.name,
              ),

              ...constraint.classes.map(
                (link) =>
                  link.class.name,
              ),
            ]
              .join(
                " ",
              )
              .toLocaleLowerCase(
                "ar",
              );

            return text.includes(
              query,
            );
          },
        );
      },
      [
        constraints,
        search,
      ],
    );

  const groupedConstraints =
    useMemo(
      () =>
        CATEGORY_ITEMS.map(
          (category) => ({
            ...category,

            constraints:
              filteredConstraints.filter(
                (constraint) =>
                  matchesCategory(
                    constraint.type,
                    category.key,
                  ),
              ),
          }),
        ).filter(
          (group) =>
            group.constraints.length >
            0,
        ),
      [
        filteredConstraints,
      ],
    );

  function showMessage(
    tone:
      | "success"
      | "error",
    text:
      string,
  ) {
    setMessage({
      tone,
      text,
    });
  }

  async function saveConstraint(
    draft:
      ConstraintDraft,
  ) {
    if (busy) {
      return;
    }

    const editing =
      formMode?.mode ===
      "edit"
        ? formMode.constraint
        : null;

    const payload:
      Record<
        string,
        unknown
      > = {
      type:
        draft.type,

      strength:
        draft.strength,

      title:
        null,

      valueInt:
        draft.valueInt,

      notes:
        draft.notes ||
        null,

      teacherIds:
        draft.teacherIds,

      subjectIds:
        draft.subjectIds,

      classIds:
        draft.classIds,

      dayIds:
        draft.dayIds,

      periodIds:
        draft.periodIds,

      slots:
        draft.slots,

      configJson:
        draft.weight !==
        null
          ? {
              weight:
                draft.weight,
            }
          : null,
    };

    try {
      setBusy(
        true,
      );

      setMessage(
        null,
      );

      const response =
        await fetch(
          `/api/dashboard/principal/timetable-v3/projects/${project.id}/constraints`,
          {
            method:
              editing
                ? "PATCH"
                : "POST",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify(
                editing
                  ? {
                      action:
                        "UPDATE_CONSTRAINT",

                      constraintId:
                        editing.id,

                      ...payload,
                    }
                  : {
                      action:
                        "CREATE_CONSTRAINT",

                      ...payload,
                    },
              ),
          },
        );

      const data =
        await response
          .json()
          .catch(
            () => null,
          );

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.error ??
          "تعذر حفظ القيد.",
        );
      }

      if (editing) {
        setConstraints(
          (current) =>
            current.map(
              (constraint) =>
                constraint.id ===
                editing.id
                  ? data.constraint
                  : constraint,
            ),
        );

        showMessage(
          "success",
          "تم تحديث القيد.",
        );
      }
      else {
        setConstraints(
          (current) => [
            data.constraint,
            ...current,
          ],
        );

        showMessage(
          "success",
          "تم إضافة القيد.",
        );
      }

      notifyTimetableHistoryUpdated();

      setFormMode(
        null,
      );

      setSelectedCategory(
        null,
      );
    }
    catch (error) {
      showMessage(
        "error",
        error instanceof Error
          ? error.message
          : "تعذر حفظ القيد.",
      );
    }
    finally {
      setBusy(
        false,
      );
    }
  }

  async function toggleConstraint(
    constraint:
      Constraint,
  ) {
    try {
      setBusy(
        true,
      );

      const response =
        await fetch(
          `/api/dashboard/principal/timetable-v3/projects/${project.id}/constraints`,
          {
            method:
              "PATCH",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "TOGGLE_CONSTRAINT",

                constraintId:
                  constraint.id,

                isActive:
                  !constraint.isActive,
              }),
          },
        );

      const data =
        await response
          .json()
          .catch(
            () => null,
          );

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.error ??
          "تعذر تحديث القيد.",
        );
      }

      setConstraints(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              constraint.id
                ? data.constraint
                : item,
          ),
      );
      notifyTimetableHistoryUpdated();
    }
    catch (error) {
      showMessage(
        "error",
        error instanceof Error
          ? error.message
          : "تعذر تحديث القيد.",
      );
    }
    finally {
      setBusy(
        false,
      );
    }
  }

  async function deleteConstraint(
    constraintId:
      string,
  ) {
    try {
      setBusy(
        true,
      );

      const response =
        await fetch(
          `/api/dashboard/principal/timetable-v3/projects/${project.id}/constraints`,
          {
            method:
              "DELETE",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                constraintId,
              }),
          },
        );

      const data =
        await response
          .json()
          .catch(
            () => null,
          );

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.error ??
          "تعذر حذف القيد.",
        );
      }

      setConstraints(
        (current) =>
          current.filter(
            (constraint) =>
              constraint.id !==
              constraintId,
          ),
      );
      notifyTimetableHistoryUpdated();

      setReviewSlot(
        null,
      );
    }
    catch (error) {
      showMessage(
        "error",
        error instanceof Error
          ? error.message
          : "تعذر حذف القيد.",
      );
    }
    finally {
      setBusy(
        false,
      );
    }
  }

  const reviewSlotConstraints =
    reviewSlot
      ? constraints.filter(
          (constraint) => {
            const direct =
              constraint.slots.some(
                (slot) =>
                  slot.dayId ===
                    reviewSlot.dayId &&
                  slot.periodId ===
                    reviewSlot.periodId,
              );

            if (direct) {
              return true;
            }

            const effective =
              effectiveSlotsForRule(
                constraintToAnalysisRule(
                  constraint,
                ),
                analysisOptions,
              );

            return effective.some(
              (slot) =>
                slot.dayId ===
                  reviewSlot.dayId &&
                slot.periodId ===
                  reviewSlot.periodId,
            );
          },
        )
      : [];

  const reviewSlotConflicts =
    reviewSlot
      ? conflictMap.get(
          slotKey(
            reviewSlot.dayId,
            reviewSlot.periodId,
          ),
        ) ??
        []
      : [];

  const formInitial =
    formMode?.mode ===
      "edit" ||
    formMode?.mode ===
      "copy"
      ? constraintToDraft(
          formMode.constraint,
        )
      : formMode?.mode ===
          "create"
        ? formMode.initial
        : undefined;

  const editingId =
    formMode?.mode ===
    "edit"
      ? formMode.constraint.id
      : null;

  const activeCount =
    constraints.filter(
      (constraint) =>
        constraint.isActive,
    ).length;

  return (
    <div
      dir="rtl"
      className="mx-auto w-full max-w-7xl space-y-5 px-4 pb-20 pt-6 sm:px-6 lg:pt-8"
    >
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black text-[#3478B8]">خدمات مدير المدرسة</p>
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            القيود
          </h1>

          <div className="mt-1 text-sm text-slate-400">
            {
              project.name
            }
          </div>
        </div>

        <button
          type="button"
          onClick={
            () => {
              setFormMode(
                null,
              );

              setSelectedCategory(
                selectedCategory
                  ? null
                  : "SCHOOL",
              );

              if (
                selectedCategory ===
                "SCHOOL"
              ) {
                setSelectedCategory(
                  null,
                );
              }
            }
          }
          className="h-11 rounded-xl bg-[#3478B8] px-5 text-sm font-semibold text-white transition hover:bg-[#2D6BA5]"
        >
          + إضافة قيد
        </button>
      </header>

      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-1/2 rounded-full bg-[#3478B8]" />
      </div>

      {message ? (
        <div
          className={[
            "rounded-2xl border px-4 py-3 text-sm font-semibold",
            message.tone ===
            "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700",
          ].join(
            " ",
          )}
        >
          {
            message.text
          }
        </div>
      ) : null}

      {!formMode &&
      selectedCategory !==
        null ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-950">
              إضافة قيد
            </h2>

            <button
              type="button"
              onClick={
                () =>
                  setSelectedCategory(
                    null,
                  )
              }
              className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-lg text-slate-500 transition hover:bg-slate-200"
            >
              ×
            </button>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-5">
            {CATEGORY_ITEMS.map(
              (category) => {
                const active =
                  selectedCategory ===
                  category.key;

                return (
                  <button
                    key={
                      category.key
                    }
                    type="button"
                    onClick={
                      () =>
                        setSelectedCategory(
                          category.key,
                        )
                    }
                    className={[
                      "rounded-2xl border px-4 py-4 text-right transition",
                      active
                        ? "border-[#3478B8] bg-[#F1F8FD]"
                        : "border-slate-200 bg-white hover:border-[#A9CEE5]",
                    ].join(
                      " ",
                    )}
                  >
                    <div
                      className={[
                        "font-bold",
                        active
                          ? "text-[#3478B8]"
                          : "text-slate-900",
                      ].join(
                        " ",
                      )}
                    >
                      {
                        category.label
                      }
                    </div>

                    <div className="mt-1 text-[11px] text-slate-400">
                      {
                        category.description
                      }
                    </div>
                  </button>
                );
              },
            )}
          </div>

          <div className="mt-5 grid gap-2 md:grid-cols-2">
            {categoryDefinitions.map(
              (definition) => (
                <button
                  key={
                    definition.type
                  }
                  type="button"
                  onClick={
                    () =>
                      setFormMode({
                        mode:
                          "create",

                        initial:
                          createDraft(
                            definition.type,
                          ),
                      })
                  }
                  className="rounded-2xl border border-slate-200 px-4 py-4 text-right transition hover:border-[#3478B8] hover:bg-[#F7FBFE]"
                >
                  <div className="font-semibold text-slate-900">
                    {
                      definition.label
                    }
                  </div>

                  <div className="mt-1 text-xs leading-5 text-slate-400">
                    {
                      definition.description
                    }
                  </div>
                </button>
              ),
            )}

            {categoryDefinitions.length ===
            0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
                لا توجد قيود في هذه الفئة
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {formMode ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-950">
              {formMode.mode ===
              "edit"
                ? "تعديل القيد"
                : formMode.mode ===
                    "copy"
                  ? "نسخ القيد"
                  : "إضافة القيد"}
            </h2>

            <button
              type="button"
              onClick={
                () =>
                  setFormMode(
                    null,
                  )
              }
              className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-lg text-slate-500 transition hover:bg-slate-200"
            >
              ×
            </button>
          </div>

          <ConstraintForm
            key={
              formMode.mode ===
              "edit"
                ? `edit-${formMode.constraint.id}`
                : formMode.mode ===
                    "copy"
                  ? `copy-${formMode.constraint.id}`
                  : `create-${formInitial?.type}`
            }
            days={
              days
            }
            periods={
              periods
            }
            teachers={
              teachers
            }
            subjects={
              subjects
            }
            classes={
              classes
            }
            existingConstraints={
              constraints
            }
            editingId={
              editingId
            }
            initial={
              formInitial
            }
            busy={
              busy
            }
            onCancel={
              () =>
                setFormMode(
                  null,
                )
            }
            onSave={
              saveConstraint
            }
            hideTypeSelector
          />
        </section>
      ) : null}

      {!formMode ? (
        <>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  القيود الحالية
                </h2>

                <div className="mt-1 text-xs text-slate-400">
                  {
                    activeCount
                  }
                  {" "}
                  نشط
                  {" · "}
                  {
                    constraints.length
                  }
                  {" "}
                  إجمالي
                </div>
              </div>

              <input
                value={
                  search
                }
                onChange={
                  (event) =>
                    setSearch(
                      event.target.value,
                    )
                }
                placeholder="بحث..."
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-[#3478B8] sm:w-60"
              />
            </div>

            {groupedConstraints.length ===
            0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
                لا توجد قيود
              </div>
            ) : (
              <div className="mt-6 space-y-7">
                {groupedConstraints.map(
                  (group) => (
                    <div
                      key={
                        group.key
                      }
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <h3 className="font-bold text-slate-900">
                          {
                            group.label
                          }
                        </h3>

                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                          {
                            group.constraints.length
                          }
                        </span>
                      </div>

                      <div className="space-y-2">
                        {group.constraints.map(
                          (constraint) => (
                            <ConstraintSummaryCard
                              key={
                                constraint.id
                              }
                              constraint={
                                constraint
                              }
                              days={
                                days
                              }
                              periods={
                                periods
                              }
                              editing={
                                false
                              }
                              busy={
                                busy
                              }
                              onEdit={
                                () =>
                                  setFormMode({
                                    mode:
                                      "edit",

                                    constraint,
                                  })
                              }
                              onToggleActive={
                                () =>
                                  void toggleConstraint(
                                    constraint,
                                  )
                              }
                              onDelete={
                                () =>
                                  void deleteConstraint(
                                    constraint.id,
                                  )
                              }
                              onCopy={
                                () =>
                                  setFormMode({
                                    mode:
                                      "copy",

                                    constraint,
                                  })
                              }
                            />
                          ),
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={
                () =>
                  setIssuesOpen(
                    (value) =>
                      !value,
                  )
              }
              className="flex w-full items-center justify-between gap-4 p-5 text-right sm:p-6"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-950">
                    مشاكل تحتاج انتباه
                  </h2>

                  {conflicts.length >
                  0 ? (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                      {
                        conflicts.length
                      }
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                      لا توجد
                    </span>
                  )}
                </div>
              </div>

              <span className="text-slate-400">
                {
                  issuesOpen
                    ? "−"
                    : "+"
                }
              </span>
            </button>

            {issuesOpen ? (
              <div className="border-t border-slate-100 p-5 sm:p-6">
                {conflicts.length ===
                0 ? (
                  <div className="rounded-2xl bg-emerald-50 px-4 py-6 text-center text-sm font-semibold text-emerald-700">
                    لا توجد تعارضات حالية
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conflicts.map(
                      (
                        conflict,
                        index,
                      ) => (
                        <div
                          key={
                            `${conflict.title}-${index}`
                          }
                          className={[
                            "rounded-2xl border p-4",
                            conflict.severity ===
                            "ERROR"
                              ? "border-red-200 bg-red-50"
                              : "border-amber-200 bg-amber-50",
                          ].join(
                            " ",
                          )}
                        >
                          <div
                            className={[
                              "font-semibold",
                              conflict.severity ===
                              "ERROR"
                                ? "text-red-800"
                                : "text-amber-800",
                            ].join(
                              " ",
                            )}
                          >
                            {
                              conflict.title
                            }
                          </div>

                          <div
                            className={[
                              "mt-1 text-xs leading-6",
                              conflict.severity ===
                              "ERROR"
                                ? "text-red-600"
                                : "text-amber-700",
                            ].join(
                              " ",
                            )}
                          >
                            {
                              conflict.description
                            }
                          </div>

                          {conflict.slots[0] ? (
                            <button
                              type="button"
                              onClick={
                                () => {
                                  setMapOpen(
                                    true,
                                  );

                                  setReviewSlot(
                                    conflict.slots[0],
                                  );
                                }
                              }
                              className="mt-3 text-xs font-bold text-[#3478B8]"
                            >
                              عرض في الخريطة
                            </button>
                          ) : null}
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={
                () =>
                  setMapOpen(
                    (value) =>
                      !value,
                  )
              }
              className="flex w-full items-center justify-between gap-4 p-5 text-right sm:p-6"
            >
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  خريطة القيود
                </h2>

                <div className="mt-1 text-xs text-slate-400">
                  عرض متقدم اختياري
                </div>
              </div>

              <span className="text-sm font-semibold text-[#3478B8]">
                {
                  mapOpen
                    ? "إخفاء"
                    : "عرض"
                }
              </span>
            </button>

            {mapOpen ? (
              <div className="border-t border-slate-100 p-4 sm:p-6">
                <ConstraintReviewGrid
                  days={
                    days
                  }
                  periods={
                    teachingPeriods
                  }
                  constraints={
                    constraints
                  }
                  conflicts={
                    conflicts
                  }
                  onCellClick={
                    setReviewSlot
                  }
                />
              </div>
            ) : null}
          </section>

        </>
      ) : null}

      {reviewSlot ? (
        <ConstraintPopCard
          dayLabel={
            days.find(
              (day) =>
                day.id ===
                reviewSlot.dayId,
            )?.label ??
            ""
          }
          periodLabel={
            teachingPeriods.find(
              (period) =>
                period.id ===
                reviewSlot.periodId,
            )?.label ??
            ""
          }
          constraints={
            reviewSlotConstraints
          }
          conflicts={
            reviewSlotConflicts
          }
          busy={
            busy
          }
          onClose={
            () =>
              setReviewSlot(
                null,
              )
          }
          onEdit={
            (constraint) => {
              setReviewSlot(
                null,
              );

              setFormMode({
                mode:
                  "edit",

                constraint,
              });
            }
          }
          onToggleActive={
            toggleConstraint
          }
          onDelete={
            deleteConstraint
          }
          onCopy={
            (constraint) => {
              setReviewSlot(
                null,
              );

              setFormMode({
                mode:
                  "copy",

                constraint,
              });
            }
          }
        />
      ) : null}
    </div>
  );
}
