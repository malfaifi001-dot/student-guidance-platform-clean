"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type DayItem = {
  id: string;
  label: string;
  order: number;
};

type PeriodItem = {
  id: string;
  label: string;
  order: number;
  isBreak: boolean;
  startTime?: string | null;
  endTime?: string | null;
};

type Teacher = {
  id: string;
  name: string;
  specialty: string | null;
  maxWeeklyLoad: number;
};

type Subject = {
  id: string;
  name: string;
};

type ClassItem = {
  id: string;
  name: string;
};

type Constraint = {
  id: string;
  type: string;
  strength: string;
  title: string | null;
  valueInt: number | null;
  notes: string | null;
  isActive: boolean;

  teachers: Array<{
    teacher: {
      id: string;
      name: string;
      specialty: string | null;
    };
  }>;

  subjects: Array<{
    subject: {
      id: string;
      name: string;
    };
  }>;

  classes: Array<{
    class: {
      id: string;
      name: string;
    };
  }>;

  days: Array<{
    dayId: string;
  }>;

  periods: Array<{
    periodId: string;
  }>;

  slots: Array<{
    dayId: string;
    periodId: string;
  }>;
};

type Tab =
  | "TIME"
  | "TEACHERS"
  | "SUBJECTS"
  | "REVIEW";

type Props = {
  project: {
    id: string;
    name: string;
    academicYear: string;
    semester: string;
  };

  days: DayItem[];
  initialPeriods: PeriodItem[];
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassItem[];
  initialConstraints: Constraint[];
};

type Slot = {
  dayId: string;
  periodId: string;
};

function slotKey(
  dayId: string,
  periodId: string,
) {
  return `${dayId}:${periodId}`;
}

const TYPE_LABELS: Record<
  string,
  string
> = {
  TEACHER_UNAVAILABLE:
    "المعلم غير متاح",

  TEACHER_PREFERRED:
    "وقت مفضل للمعلم",

  SUBJECT_BLOCKED:
    "وقت ممنوع للمادة",

  SUBJECT_PREFERRED:
    "وقت مفضل للمادة",

  CLASS_BLOCKED_SLOT:
    "الفصل غير متاح",

  FIXED_ASSIGNMENT:
    "تثبيت إسناد",
};

function toneForType(
  type: string,
) {
  if (
    type ===
      "TEACHER_UNAVAILABLE" ||
    type ===
      "SUBJECT_BLOCKED" ||
    type ===
      "CLASS_BLOCKED_SLOT"
  ) {
    return "danger";
  }

  if (
    type ===
    "FIXED_ASSIGNMENT"
  ) {
    return "fixed";
  }

  return "preferred";
}

export function TimetableV2ConstraintsWorkspace({
  project,
  days,
  initialPeriods,
  teachers,
  subjects,
  classes,
  initialConstraints,
}: Props) {
  const router =
    useRouter();

  const [
    tab,
    setTab,
  ] = useState<Tab>(
    "TEACHERS",
  );

  const [
    periods,
    setPeriods,
  ] = useState(
    initialPeriods,
  );

  const [
    constraints,
    setConstraints,
  ] = useState(
    initialConstraints,
  );

  const [
    selectedTeacherId,
    setSelectedTeacherId,
  ] = useState(
    teachers[0]?.id ?? "",
  );

  const [
    selectedSlots,
    setSelectedSlots,
  ] = useState<
    Set<string>
  >(
    new Set(),
  );

  const [
    teacherRuleType,
    setTeacherRuleType,
  ] = useState<
    "TEACHER_UNAVAILABLE" |
    "TEACHER_PREFERRED"
  >(
    "TEACHER_UNAVAILABLE",
  );

  const [
    selectedSubjectIds,
    setSelectedSubjectIds,
  ] = useState<string[]>(
    [],
  );

  const [
    selectedClassIds,
    setSelectedClassIds,
  ] = useState<string[]>(
    [],
  );

  const [
    selectedDayIds,
    setSelectedDayIds,
  ] = useState<string[]>(
    [],
  );

  const [
    selectedPeriodIds,
    setSelectedPeriodIds,
  ] = useState<string[]>(
    [],
  );

  const [
    subjectRuleType,
    setSubjectRuleType,
  ] = useState(
    "SUBJECT_PREFERRED",
  );

  const [
    reviewSlot,
    setReviewSlot,
  ] = useState<Slot | null>(
    null,
  );

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState<{
    tone:
      | "success"
      | "error"
      | "info";
    text: string;
  } | null>(null);

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
      [periods],
    );

  const selectedTeacher =
    teachers.find(
      (teacher) =>
        teacher.id ===
        selectedTeacherId,
    );

  const constraintsForSlot =
    (
      dayId: string,
      periodId: string,
    ) =>
      constraints.filter(
        (constraint) => {
          if (
            !constraint.isActive
          ) {
            return false;
          }

          if (
            constraint.slots.some(
              (slot) =>
                slot.dayId ===
                  dayId &&
                slot.periodId ===
                  periodId,
            )
          ) {
            return true;
          }

          const hasDay =
            constraint.days.some(
              (day) =>
                day.dayId ===
                dayId,
            );

          const hasPeriod =
            constraint.periods.some(
              (period) =>
                period.periodId ===
                periodId,
            );

          return (
            hasDay &&
            hasPeriod
          );
        },
      );

  const teacherCellConstraint =
    (
      dayId: string,
      periodId: string,
    ) =>
      constraints.find(
        (constraint) =>
          constraint.isActive &&
          constraint.teachers.some(
            (link) =>
              link.teacher.id ===
              selectedTeacherId,
          ) &&
          constraint.slots.some(
            (slot) =>
              slot.dayId ===
                dayId &&
              slot.periodId ===
                periodId,
          ),
      );

  const toggleSlot =
    (
      dayId: string,
      periodId: string,
    ) => {
      const key =
        slotKey(
          dayId,
          periodId,
        );

      setSelectedSlots(
        (current) => {
          const next =
            new Set(
              current,
            );

          if (
            next.has(key)
          ) {
            next.delete(
              key,
            );
          } else {
            next.add(
              key,
            );
          }

          return next;
        },
      );
    };

  const createConstraint =
    async (
      payload: Record<
        string,
        unknown
      >,
    ) => {
      const response =
        await fetch(
          `/api/dashboard/principal/timetable-v2/projects/${project.id}/constraints`,
          {
            method: "POST",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "CREATE_CONSTRAINT",

                ...payload,
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
          data?.error ||
            "تعذر حفظ القيد.",
        );
      }

      setConstraints(
        (current) => [
          data.constraint,
          ...current,
        ],
      );
    };

  const applyTeacherSlots =
    async () => {
      if (
        !selectedTeacherId ||
        selectedSlots.size ===
          0
      ) {
        setMessage({
          tone: "info",
          text:
            "اختر معلمًا وحدد خلية واحدة على الأقل.",
        });

        return;
      }

      const slots =
        [...selectedSlots].map(
          (key) => {
            const [
              dayId,
              periodId,
            ] =
              key.split(":");

            return {
              dayId,
              periodId,
            };
          },
        );

      try {
        setBusy(true);

        await createConstraint({
          type:
            teacherRuleType,

          strength:
            teacherRuleType ===
            "TEACHER_UNAVAILABLE"
              ? "HARD"
              : "SOFT",

          teacherIds: [
            selectedTeacherId,
          ],

          slots,
        });

        setSelectedSlots(
          new Set(),
        );

        setMessage({
          tone: "success",
          text:
            `تم حفظ القيد على ${slots.length} خلية كقيد واحد.`,
        });
      } catch (error) {
        setMessage({
          tone: "error",
          text:
            error instanceof Error
              ? error.message
              : "تعذر حفظ القيد.",
        });
      } finally {
        setBusy(false);
      }
    };

  const createSubjectRule =
    async () => {
      if (
        selectedSubjectIds.length ===
          0 &&
        selectedClassIds.length ===
          0
      ) {
        setMessage({
          tone: "info",
          text:
            "اختر مادة أو فصلًا واحدًا على الأقل.",
        });

        return;
      }

      if (
        selectedDayIds.length ===
          0 ||
        selectedPeriodIds.length ===
          0
      ) {
        setMessage({
          tone: "info",
          text:
            "اختر الأيام والحصص التي ينطبق عليها القيد.",
        });

        return;
      }

      try {
        setBusy(true);

        await createConstraint({
          type:
            subjectRuleType,

          strength:
            subjectRuleType.includes(
              "BLOCKED",
            )
              ? "HARD"
              : "SOFT",

          subjectIds:
            selectedSubjectIds,

          classIds:
            selectedClassIds,

          dayIds:
            selectedDayIds,

          periodIds:
            selectedPeriodIds,
        });

        setMessage({
          tone: "success",
          text:
            "تم إنشاء القيد بنجاح.",
        });
      } catch (error) {
        setMessage({
          tone: "error",
          text:
            error instanceof Error
              ? error.message
              : "تعذر حفظ القيد.",
        });
      } finally {
        setBusy(false);
      }
    };

  const deleteConstraint =
    async (
      constraintId: string,
    ) => {
      try {
        setBusy(true);

        const response =
          await fetch(
            `/api/dashboard/principal/timetable-v2/projects/${project.id}/constraints`,
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
            data?.error ||
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

        setMessage({
          tone: "success",
          text:
            "تم حذف القيد.",
        });
      } catch (error) {
        setMessage({
          tone: "error",
          text:
            error instanceof Error
              ? error.message
              : "تعذر حذف القيد.",
        });
      } finally {
        setBusy(false);
      }
    };

  const savePeriods =
    async () => {
      try {
        setBusy(true);

        const normalized =
          [...periods]
            .sort(
              (a, b) =>
                a.order -
                b.order,
            )
            .map(
              (
                period,
                index,
              ) => ({
                ...period,
                order:
                  index + 1,
              }),
            );

        const response =
          await fetch(
            `/api/dashboard/principal/timetable-v2/projects/${project.id}/constraints`,
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
                    "SAVE_PERIODS",

                  periods:
                    normalized,
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
            data?.error ||
              "تعذر حفظ أوقات اليوم.",
          );
        }

        setPeriods(
          normalized,
        );

        setMessage({
          tone: "success",
          text:
            "تم حفظ أوقات اليوم.",
        });
      } catch (error) {
        setMessage({
          tone: "error",
          text:
            error instanceof Error
              ? error.message
              : "تعذر حفظ الأوقات.",
        });
      } finally {
        setBusy(false);
      }
    };

  const addBreakAfter =
    (
      index: number,
    ) => {
      const next = [
        ...periods,
      ].sort(
        (a, b) =>
          a.order -
          b.order,
      );

      next.splice(
        index + 1,
        0,
        {
          id:
            `BREAK_${Date.now()}`,

          label:
            "فسحة",

          order:
            index + 2,

          isBreak:
            true,

          startTime:
            null,

          endTime:
            null,
        },
      );

      setPeriods(
        next.map(
          (
            period,
            order,
          ) => ({
            ...period,
            order:
              order + 1,
          }),
        ),
      );
    };

  const selectedReviewConstraints =
    reviewSlot
      ? constraintsForSlot(
          reviewSlot.dayId,
          reviewSlot.periodId,
        )
      : [];

  return (
    <div
      dir="rtl"
      className="mx-auto max-w-[1600px] space-y-5 pb-20"
    >
      <section className="rounded-[2rem] border border-slate-200 bg-gradient-to-l from-teal-50 via-white to-cyan-50 p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-black text-teal-700">
              الخطوة 4
            </div>

            <h1 className="mt-3 text-3xl font-black text-slate-950">
              القيود والأوقات
            </h1>

            <p className="mt-2 text-sm leading-7 text-slate-500">
              {project.name}
              {" • "}
              حدد الواقع المدرسي بصريًا قبل إنشاء الجدول.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                `/dashboard/timetable-v2/${project.id}`,
              )
            }
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700"
          >
            العودة للمشروع
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <Metric
            label="إجمالي القيود"
            value={
              constraints.length
            }
          />

          <Metric
            label="إلزامية"
            value={
              constraints.filter(
                (item) =>
                  item.strength ===
                  "HARD",
              ).length
            }
          />

          <Metric
            label="تفضيلات"
            value={
              constraints.filter(
                (item) =>
                  item.strength ===
                  "SOFT",
              ).length
            }
          />

          <Metric
            label="خلايا مقيدة"
            value={
              new Set(
                constraints.flatMap(
                  (item) =>
                    item.slots.map(
                      (slot) =>
                        slotKey(
                          slot.dayId,
                          slot.periodId,
                        ),
                    ),
                ),
              ).size
            }
          />
        </div>
      </section>

      {message ? (
        <div
          className={[
            "rounded-2xl border px-5 py-4 text-sm font-bold",
            message.tone ===
            "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : message.tone ===
                  "error"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-sky-200 bg-sky-50 text-sky-800",
          ].join(" ")}
        >
          {message.text}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-2 md:grid-cols-4">
          {(
            [
              [
                "TIME",
                "أوقات اليوم",
              ],
              [
                "TEACHERS",
                "قيود المعلمين",
              ],
              [
                "SUBJECTS",
                "المواد والفصول",
              ],
              [
                "REVIEW",
                "مراجعة القيود",
              ],
            ] as const
          ).map(
            ([
              value,
              label,
            ]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setTab(
                    value,
                  )
                }
                className={[
                  "h-12 rounded-2xl text-sm font-black transition",
                  tab === value
                    ? "bg-slate-950 text-white shadow-sm"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100",
                ].join(" ")}
              >
                {label}
              </button>
            ),
          )}
        </div>
      </section>

      {tab === "TIME" ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">
                توقيت اليوم الدراسي
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                أضف الفسحات بين الحصص وحدد البداية والنهاية.
              </p>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={
                savePeriods
              }
              className="h-11 rounded-xl bg-teal-700 px-5 text-sm font-black text-white disabled:opacity-50"
            >
              حفظ الأوقات
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {[...periods]
              .sort(
                (a, b) =>
                  a.order -
                  b.order,
              )
              .map(
                (
                  period,
                  index,
                ) => (
                  <div
                    key={
                      period.id
                    }
                    className={[
                      "rounded-2xl border p-4",
                      period.isBreak
                        ? "border-amber-200 bg-amber-50"
                        : "border-slate-200 bg-slate-50",
                    ].join(" ")}
                  >
                    <div className="grid gap-3 md:grid-cols-[160px_1fr_1fr_auto] md:items-end">
                      <label>
                        <span className="text-xs font-black text-slate-500">
                          الاسم
                        </span>

                        <input
                          value={
                            period.label
                          }
                          onChange={(event) =>
                            setPeriods(
                              (current) =>
                                current.map(
                                  (item) =>
                                    item.id ===
                                    period.id
                                      ? {
                                          ...item,
                                          label:
                                            event.target.value,
                                        }
                                      : item,
                                ),
                            )
                          }
                          className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-bold"
                        />
                      </label>

                      <label>
                        <span className="text-xs font-black text-slate-500">
                          البداية
                        </span>

                        <input
                          type="time"
                          value={
                            period.startTime ??
                            ""
                          }
                          onChange={(event) =>
                            setPeriods(
                              (current) =>
                                current.map(
                                  (item) =>
                                    item.id ===
                                    period.id
                                      ? {
                                          ...item,
                                          startTime:
                                            event.target.value,
                                        }
                                      : item,
                                ),
                            )
                          }
                          className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3"
                        />
                      </label>

                      <label>
                        <span className="text-xs font-black text-slate-500">
                          النهاية
                        </span>

                        <input
                          type="time"
                          value={
                            period.endTime ??
                            ""
                          }
                          onChange={(event) =>
                            setPeriods(
                              (current) =>
                                current.map(
                                  (item) =>
                                    item.id ===
                                    period.id
                                      ? {
                                          ...item,
                                          endTime:
                                            event.target.value,
                                        }
                                      : item,
                                ),
                            )
                          }
                          className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3"
                        />
                      </label>

                      {!period.isBreak ? (
                        <button
                          type="button"
                          onClick={() =>
                            addBreakAfter(
                              index,
                            )
                          }
                          className="h-11 rounded-xl border border-amber-200 bg-white px-4 text-xs font-black text-amber-700"
                        >
                          + فسحة بعدها
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setPeriods(
                              (current) =>
                                current.filter(
                                  (item) =>
                                    item.id !==
                                    period.id,
                                ),
                            )
                          }
                          className="h-11 rounded-xl border border-rose-200 bg-white px-4 text-xs font-black text-rose-700"
                        >
                          حذف الفسحة
                        </button>
                      )}
                    </div>
                  </div>
                ),
              )}
          </div>
        </section>
      ) : null}

      {tab ===
      "TEACHERS" ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:p-7">
          <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
            <aside>
              <label className="block">
                <span className="text-xs font-black text-slate-500">
                  المعلم
                </span>

                <select
                  value={
                    selectedTeacherId
                  }
                  onChange={(event) => {
                    setSelectedTeacherId(
                      event.target.value,
                    );

                    setSelectedSlots(
                      new Set(),
                    );
                  }}
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 font-black"
                >
                  {teachers.map(
                    (teacher) => (
                      <option
                        key={
                          teacher.id
                        }
                        value={
                          teacher.id
                        }
                      >
                        {teacher.name}
                      </option>
                    ),
                  )}
                </select>
              </label>

              {selectedTeacher ? (
                <div className="mt-3 rounded-2xl border border-teal-200 bg-teal-50 p-4">
                  <div className="font-black">
                    {
                      selectedTeacher.name
                    }
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {selectedTeacher.specialty ||
                      "بدون تخصص"}
                  </div>

                  <div className="mt-3 text-xs font-black text-teal-700">
                    الحد الأسبوعي:{" "}
                    {
                      selectedTeacher.maxWeeklyLoad
                    }
                  </div>
                </div>
              ) : null}

              <div className="mt-4">
                <div className="text-xs font-black text-slate-500">
                  نوع القيد
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setTeacherRuleType(
                        "TEACHER_UNAVAILABLE",
                      )
                    }
                    className={[
                      "rounded-xl border px-3 py-3 text-xs font-black",
                      teacherRuleType ===
                      "TEACHER_UNAVAILABLE"
                        ? "border-rose-400 bg-rose-50 text-rose-700"
                        : "border-slate-200",
                    ].join(" ")}
                  >
                    غير متاح
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setTeacherRuleType(
                        "TEACHER_PREFERRED",
                      )
                    }
                    className={[
                      "rounded-xl border px-3 py-3 text-xs font-black",
                      teacherRuleType ===
                      "TEACHER_PREFERRED"
                        ? "border-teal-400 bg-teal-50 text-teal-700"
                        : "border-slate-200",
                    ].join(" ")}
                  >
                    مفضل
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-500">
                اضغط أي عدد من الخلايا.
                سيتم حفظها كلها كقيد
                واحد، وليس كقيود مكررة.
              </div>

              <button
                type="button"
                disabled={
                  busy ||
                  selectedSlots.size ===
                    0
                }
                onClick={
                  applyTeacherSlots
                }
                className="mt-4 h-12 w-full rounded-xl bg-teal-700 font-black text-white disabled:opacity-40"
              >
                تطبيق على{" "}
                {
                  selectedSlots.size
                }{" "}
                خلية
              </button>
            </aside>

            <div className="min-w-0 overflow-auto rounded-2xl border border-slate-200">
              <table className="min-w-[850px] w-full border-collapse">
                <thead>
                  <tr>
                    <th className="sticky right-0 z-10 border-b border-l border-slate-200 bg-slate-950 px-4 py-3 text-right text-xs text-white">
                      اليوم
                    </th>

                    {teachingPeriods.map(
                      (period) => (
                        <th
                          key={
                            period.id
                          }
                          className="border-b border-l border-slate-200 bg-slate-950 px-3 py-3 text-center text-xs text-white"
                        >
                          <div className="font-black">
                            {
                              period.label
                            }
                          </div>

                          <div className="mt-1 text-[9px] font-normal text-slate-300">
                            {period.startTime ||
                              "—"}
                            {" - "}
                            {period.endTime ||
                              "—"}
                          </div>
                        </th>
                      ),
                    )}
                  </tr>
                </thead>

                <tbody>
                  {days.map(
                    (day) => (
                      <tr
                        key={
                          day.id
                        }
                      >
                        <td className="sticky right-0 border-b border-l border-slate-200 bg-white px-4 py-4 font-black">
                          {
                            day.label
                          }
                        </td>

                        {teachingPeriods.map(
                          (period) => {
                            const key =
                              slotKey(
                                day.id,
                                period.id,
                              );

                            const selected =
                              selectedSlots.has(
                                key,
                              );

                            const existing =
                              teacherCellConstraint(
                                day.id,
                                period.id,
                              );

                            const tone =
                              existing
                                ? toneForType(
                                    existing.type,
                                  )
                                : null;

                            return (
                              <td
                                key={
                                  period.id
                                }
                                className="border-b border-l border-slate-100 p-2"
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleSlot(
                                      day.id,
                                      period.id,
                                    )
                                  }
                                  className={[
                                    "min-h-16 w-full rounded-xl border text-xs font-black transition",
                                    selected
                                      ? "border-sky-500 bg-sky-50 ring-2 ring-sky-100"
                                      : tone ===
                                          "danger"
                                        ? "border-rose-300 bg-rose-50 text-rose-700"
                                        : tone ===
                                            "preferred"
                                          ? "border-teal-300 bg-teal-50 text-teal-700"
                                          : "border-slate-200 bg-white text-slate-400 hover:border-sky-300",
                                  ].join(" ")}
                                >
                                  {selected
                                    ? "محدد"
                                    : existing
                                      ? TYPE_LABELS[
                                          existing.type
                                        ] ??
                                        "مقيد"
                                      : "متاح"}
                                </button>
                              </td>
                            );
                          },
                        )}
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {tab ===
      "SUBJECTS" ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:p-7">
          <div>
            <h2 className="text-xl font-black">
              قيود المواد والفصول
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              الاختيار متعدد في كل جزء.
            </p>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <ChoiceBox
              title="المواد"
              items={
                subjects
              }
              selected={
                selectedSubjectIds
              }
              onToggle={(id) =>
                setSelectedSubjectIds(
                  (current) =>
                    current.includes(
                      id,
                    )
                      ? current.filter(
                          (item) =>
                            item !== id,
                        )
                      : [
                          ...current,
                          id,
                        ],
                )
              }
            />

            <ChoiceBox
              title="الفصول"
              items={
                classes
              }
              selected={
                selectedClassIds
              }
              onToggle={(id) =>
                setSelectedClassIds(
                  (current) =>
                    current.includes(
                      id,
                    )
                      ? current.filter(
                          (item) =>
                            item !== id,
                        )
                      : [
                          ...current,
                          id,
                        ],
                )
              }
            />

            <ChoiceBox
              title="الأيام"
              items={
                days.map(
                  (day) => ({
                    id:
                      day.id,
                    name:
                      day.label,
                  }),
                )
              }
              selected={
                selectedDayIds
              }
              onToggle={(id) =>
                setSelectedDayIds(
                  (current) =>
                    current.includes(
                      id,
                    )
                      ? current.filter(
                          (item) =>
                            item !== id,
                        )
                      : [
                          ...current,
                          id,
                        ],
                )
              }
            />

            <ChoiceBox
              title="الحصص"
              items={
                teachingPeriods.map(
                  (period) => ({
                    id:
                      period.id,
                    name:
                      period.label,
                  }),
                )
              }
              selected={
                selectedPeriodIds
              }
              onToggle={(id) =>
                setSelectedPeriodIds(
                  (current) =>
                    current.includes(
                      id,
                    )
                      ? current.filter(
                          (item) =>
                            item !== id,
                        )
                      : [
                          ...current,
                          id,
                        ],
                )
              }
            />
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <select
                value={
                  subjectRuleType
                }
                onChange={(event) =>
                  setSubjectRuleType(
                    event.target.value,
                  )
                }
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 font-black"
              >
                <option value="SUBJECT_PREFERRED">
                  وقت مفضل للمادة
                </option>

                <option value="SUBJECT_BLOCKED">
                  وقت ممنوع للمادة
                </option>

                <option value="CLASS_BLOCKED_SLOT">
                  الفصل غير متاح
                </option>
              </select>

              <button
                type="button"
                disabled={busy}
                onClick={
                  createSubjectRule
                }
                className="h-11 rounded-xl bg-teal-700 px-6 text-sm font-black text-white"
              >
                إنشاء القيد
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {tab ===
      "REVIEW" ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:p-7">
          <div>
            <h2 className="text-xl font-black">
              خريطة القيود
            </h2>

            <p className="mt-1 text-xs leading-6 text-slate-500">
              هذه هي الصورة التي سيقرأها محرك إنشاء الجدول.
              اضغط أي خلية لعرض القيود المؤثرة عليها.
            </p>
          </div>

          <div className="mt-5 overflow-auto rounded-2xl border border-slate-200">
            <table className="min-w-[900px] w-full border-collapse">
              <thead>
                <tr>
                  <th className="sticky right-0 z-10 border-b border-l border-slate-200 bg-slate-950 px-4 py-3 text-right text-white">
                    الحصة
                  </th>

                  {days.map(
                    (day) => (
                      <th
                        key={
                          day.id
                        }
                        className="border-b border-l border-slate-200 bg-slate-950 px-4 py-3 text-center text-sm font-black text-white"
                      >
                        {
                          day.label
                        }
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody>
                {teachingPeriods.map(
                  (period) => (
                    <tr
                      key={
                        period.id
                      }
                    >
                      <td className="sticky right-0 border-b border-l border-slate-200 bg-white px-4 py-4">
                        <div className="font-black">
                          {
                            period.label
                          }
                        </div>

                        <div className="mt-1 text-[10px] text-slate-400">
                          {period.startTime ||
                            "—"}
                          {" - "}
                          {period.endTime ||
                            "—"}
                        </div>
                      </td>

                      {days.map(
                        (day) => {
                          const items =
                            constraintsForSlot(
                              day.id,
                              period.id,
                            );

                          const hard =
                            items.filter(
                              (item) =>
                                item.strength ===
                                "HARD",
                            ).length;

                          const soft =
                            items.filter(
                              (item) =>
                                item.strength ===
                                "SOFT",
                            ).length;

                          return (
                            <td
                              key={
                                day.id
                              }
                              className="border-b border-l border-slate-100 p-2"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setReviewSlot({
                                    dayId:
                                      day.id,

                                    periodId:
                                      period.id,
                                  })
                                }
                                className={[
                                  "min-h-24 w-full rounded-xl border p-3 text-right transition",
                                  hard > 0
                                    ? "border-rose-200 bg-rose-50 hover:border-rose-400"
                                    : soft >
                                        0
                                      ? "border-teal-200 bg-teal-50 hover:border-teal-400"
                                      : "border-slate-200 bg-slate-50 hover:border-slate-300",
                                ].join(" ")}
                              >
                                {items.length ===
                                0 ? (
                                  <div className="text-center text-xs font-bold text-slate-400">
                                    لا توجد قيود
                                  </div>
                                ) : (
                                  <>
                                    <div className="font-black text-slate-900">
                                      {
                                        items.length
                                      }{" "}
                                      قيود
                                    </div>

                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {hard >
                                      0 ? (
                                        <span className="rounded-full bg-rose-100 px-2 py-1 text-[9px] font-black text-rose-700">
                                          {hard} إلزامي
                                        </span>
                                      ) : null}

                                      {soft >
                                      0 ? (
                                        <span className="rounded-full bg-teal-100 px-2 py-1 text-[9px] font-black text-teal-700">
                                          {soft} تفضيل
                                        </span>
                                      ) : null}
                                    </div>
                                  </>
                                )}
                              </button>
                            </td>
                          );
                        },
                      )}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {reviewSlot ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/25 p-3 backdrop-blur-sm md:items-center">
          <div className="w-full max-w-xl rounded-[2rem] bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-black text-teal-700">
                  تفاصيل الخلية
                </div>

                <h3 className="mt-2 text-xl font-black">
                  {
                    days.find(
                      (day) =>
                        day.id ===
                        reviewSlot.dayId,
                    )?.label
                  }
                  {" • "}
                  {
                    teachingPeriods.find(
                      (period) =>
                        period.id ===
                        reviewSlot.periodId,
                    )?.label
                  }
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setReviewSlot(
                    null,
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg"
              >
                ×
              </button>
            </div>

            <div className="mt-5 max-h-[60vh] space-y-2 overflow-y-auto">
              {selectedReviewConstraints.length ===
              0 ? (
                <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                  لا توجد قيود في هذه الخلية.
                </div>
              ) : (
                selectedReviewConstraints.map(
                  (constraint) => (
                    <div
                      key={
                        constraint.id
                      }
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-black text-slate-900">
                            {TYPE_LABELS[
                              constraint.type
                            ] ??
                              constraint.type}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {constraint.strength ===
                            "HARD"
                              ? "إلزامي"
                              : "تفضيل"}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={
                            busy
                          }
                          onClick={() =>
                            deleteConstraint(
                              constraint.id,
                            )
                          }
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700"
                        >
                          حذف
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1">
                        {constraint.teachers.map(
                          (link) => (
                            <span
                              key={
                                link.teacher.id
                              }
                              className="rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-slate-600"
                            >
                              {
                                link.teacher.name
                              }
                            </span>
                          ),
                        )}

                        {constraint.subjects.map(
                          (link) => (
                            <span
                              key={
                                link.subject.id
                              }
                              className="rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-slate-600"
                            >
                              {
                                link.subject.name
                              }
                            </span>
                          ),
                        )}

                        {constraint.classes.map(
                          (link) => (
                            <span
                              key={
                                link.class.id
                              }
                              className="rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-slate-600"
                            >
                              {
                                link.class.name
                              }
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                  ),
                )
              )}
            </div>
          </div>
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
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
      <div className="text-xs font-bold text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-2xl font-black text-slate-950">
        {value}
      </div>
    </div>
  );
}

function ChoiceBox({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;

  items: Array<{
    id: string;
    name: string;
  }>;

  selected: string[];

  onToggle:
    (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="font-black text-slate-900">
        {title}
      </div>

      <div className="mt-3 flex max-h-48 flex-wrap gap-2 overflow-y-auto">
        {items.map(
          (item) => {
            const active =
              selected.includes(
                item.id,
              );

            return (
              <button
                key={
                  item.id
                }
                type="button"
                onClick={() =>
                  onToggle(
                    item.id,
                  )
                }
                className={[
                  "rounded-xl border px-3 py-2 text-xs font-black transition",
                  active
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-slate-200 bg-white text-slate-600",
                ].join(" ")}
              >
                {
                  item.name
                }
              </button>
            );
          },
        )}
      </div>
    </div>
  );
}