"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  TIMETABLE_V2_CURRICULUM_TRACK_LABELS,
  TIMETABLE_V2_DAY_LABELS,
  TIMETABLE_V2_DEFAULT_SECTION_NAMES,
  TIMETABLE_V2_DEFAULT_STUDY_DAYS,
  TIMETABLE_V2_STAGES,
  calculateTimetableV2PlanDemand,
  createTimetableV2GradeSetups,
  createTimetableV2ProjectBlueprint,
  findTimetableV2CurriculumPlans,
  getTimetableV2DefaultCurriculumPlan,
  getTimetableV2Grade,
  type TimetableV2CurriculumPlan,
  type TimetableV2GradeSetup,
  type TimetableV2SemesterId,
  type TimetableV2StageId,
  type TimetableV2StudyDayId,
} from "@/lib/timetable-v2";

type SetupState = {
  name: string;
  academicYear: string;
  semester: TimetableV2SemesterId;

  stageIds: TimetableV2StageId[];

  teacherCount: number;

  weeklyPeriodTarget: number | null;

  studyDays: TimetableV2StudyDayId[];

  periodsPerDay: number;

  grades: TimetableV2GradeSetup[];
};

type GradePlanSelections = Record<
  string,
  string
>;

type ProjectPreview = {
  classesCount: number;
  weeklyCapacityPerClass: number;
  totalAvailableSlots: number;
  totalRequiredPeriods: number;
  remainingSlots: number;
  subjectRowsCount: number;
};

const CURRENT_ACADEMIC_YEAR = "1448";

const SEMESTER_OPTIONS: Array<{
  id: TimetableV2SemesterId;
  name: string;
}> = [
  {
    id: "FIRST",
    name: "الفصل الدراسي الأول",
  },
  {
    id: "SECOND",
    name: "الفصل الدراسي الثاني",
  },
];

function ToggleCard({
  active,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-2xl border p-4 text-right transition",
        active
          ? "border-teal-500 bg-teal-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-bold text-slate-900">
            {title}
          </div>

          {subtitle ? (
            <div className="mt-1 text-xs text-slate-500">
              {subtitle}
            </div>
          ) : null}
        </div>

        <span
          className={[
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
            active
              ? "border-teal-600 bg-teal-600 text-white"
              : "border-slate-300 bg-white text-transparent",
          ].join(" ")}
        >
          ✓
        </span>
      </div>
    </button>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?:
    | "default"
    | "success"
    | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : "border-slate-200 bg-white";

  return (
    <div
      className={[
        "rounded-2xl border p-4",
        toneClass,
      ].join(" ")}
    >
      <div className="text-xs font-medium text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-2xl font-black text-slate-900">
        {value}
      </div>

      {hint ? (
        <div className="mt-1 text-xs text-slate-500">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function SubjectPlanTable({
  plan,
  sectionCount,
}: {
  plan: TimetableV2CurriculumPlan;
  sectionCount: number;
}) {
  const demand =
    calculateTimetableV2PlanDemand(
      plan,
      sectionCount,
    );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-bold text-slate-900">
            {plan.sourceName}
          </div>

          <div className="mt-1 text-xs text-slate-500">
            {
              TIMETABLE_V2_CURRICULUM_TRACK_LABELS[
                plan.trackId
              ]
            }
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-teal-50 px-3 py-1 font-bold text-teal-700">
            {plan.totalWeeklyPeriods} حصة
            لكل فصل
          </span>

          <span className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-700">
            {sectionCount} فصول
          </span>

          <span className="rounded-full bg-cyan-50 px-3 py-1 font-bold text-cyan-700">
            {demand.totalWeeklyPeriods} حصة
            مطلوبة
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="bg-white text-xs text-slate-500">
            <tr className="border-b border-slate-100">
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
                لكل فصل
              </th>

              <th className="px-3 py-3 text-center">
                إجمالي الفصول
              </th>
            </tr>
          </thead>

          <tbody>
            {demand.subjects.map(
              (subject, index) => (
                <tr
                  key={`${subject.sourceName}-${index}`}
                  className="border-b border-slate-50 last:border-b-0"
                >
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800">
                      {
                        subject.canonicalName
                      }
                    </div>

                    {subject.sourceName !==
                    subject.canonicalName ? (
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        المصدر:{" "}
                        {subject.sourceName}
                      </div>
                    ) : null}
                  </td>

                  <td className="px-3 py-3 text-center font-medium text-slate-600">
                    {subject.oddClasses}
                  </td>

                  <td className="px-3 py-3 text-center font-medium text-slate-600">
                    {subject.evenClasses}
                  </td>

                  <td className="px-3 py-3 text-center font-bold text-slate-800">
                    {
                      subject.weeklyPeriods
                    }
                  </td>

                  <td className="px-3 py-3 text-center font-black text-teal-700">
                    {
                      subject.totalWeeklyPeriods
                    }
                  </td>
                </tr>
              ),
            )}
          </tbody>

          <tfoot>
            <tr className="bg-slate-50 font-bold">
              <td className="px-4 py-3">
                الإجمالي
              </td>

              <td />

              <td />

              <td className="px-3 py-3 text-center">
                {
                  plan.totalWeeklyPeriods
                }
              </td>

              <td className="px-3 py-3 text-center text-teal-700">
                {
                  demand.totalWeeklyPeriods
                }
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export function TimetableV2ProjectSetupWizard() {
  const [state, setState] =
    useState<SetupState>({
      name: "جدول المدرسة",
      academicYear:
        CURRENT_ACADEMIC_YEAR,
      semester: "FIRST",
      stageIds: [],
      teacherCount: 1,
      weeklyPeriodTarget: null,
      studyDays: [
        ...TIMETABLE_V2_DEFAULT_STUDY_DAYS,
      ],
      periodsPerDay: 7,
      grades: [],
    });

  const [
    gradePlanSelections,
    setGradePlanSelections,
  ] = useState<GradePlanSelections>(
    {},
  );

  const [
    previewError,
    setPreviewError,
  ] = useState<string | null>(
    null,
  );

  const [
    preview,
    setPreview,
  ] = useState<ProjectPreview | null>(
    null,
  );

  const toggleStage = (
    stageId: TimetableV2StageId,
  ) => {
    setState((current) => {
      const exists =
        current.stageIds.includes(
          stageId,
        );

      const stageIds = exists
        ? current.stageIds.filter(
            (item) =>
              item !== stageId,
          )
        : [
            ...current.stageIds,
            stageId,
          ];

      const previousSections =
        new Map(
          current.grades.map(
            (grade) => [
              grade.gradeId,
              grade.sectionNames,
            ],
          ),
        );

      const grades =
        createTimetableV2GradeSetups(
          stageIds,
        ).map((grade) => ({
          ...grade,
          sectionNames:
            previousSections.get(
              grade.gradeId,
            ) ??
            grade.sectionNames,
        }));

      return {
        ...current,
        stageIds,
        grades,
      };
    });

    setPreview(null);
  };

  const toggleStudyDay = (
    dayId: TimetableV2StudyDayId,
  ) => {
    setState((current) => ({
      ...current,
      studyDays:
        current.studyDays.includes(
          dayId,
        )
          ? current.studyDays.filter(
              (item) =>
                item !== dayId,
            )
          : [
              ...current.studyDays,
              dayId,
            ],
    }));

    setPreview(null);
  };

  const updateSectionCount = (
    gradeId: string,
    count: number,
  ) => {
    const safeCount = Math.max(
      1,
      Math.min(
        TIMETABLE_V2_DEFAULT_SECTION_NAMES.length,
        count,
      ),
    );

    setState((current) => ({
      ...current,
      grades: current.grades.map(
        (grade) =>
          grade.gradeId === gradeId
            ? {
                ...grade,
                sectionNames:
                  TIMETABLE_V2_DEFAULT_SECTION_NAMES.slice(
                    0,
                    safeCount,
                  ),
              }
            : grade,
      ),
    }));

    setPreview(null);
  };

  const renameSection = (
    gradeId: string,
    index: number,
    value: string,
  ) => {
    setState((current) => ({
      ...current,
      grades: current.grades.map(
        (grade) => {
          if (
            grade.gradeId !==
            gradeId
          ) {
            return grade;
          }

          const sectionNames = [
            ...grade.sectionNames,
          ];

          sectionNames[index] =
            value;

          return {
            ...grade,
            sectionNames,
          };
        },
      ),
    }));

    setPreview(null);
  };

  const curriculumOptions =
    useMemo(() => {
      const map =
        new Map<
          string,
          TimetableV2CurriculumPlan[]
        >();

      for (
        const gradeSetup of
        state.grades
      ) {
        const grade =
          getTimetableV2Grade(
            gradeSetup.gradeId,
          );

        if (!grade) {
          map.set(
            gradeSetup.gradeId,
            [],
          );

          continue;
        }

        const plans =
          findTimetableV2CurriculumPlans(
            {
              gradeId:
                gradeSetup.gradeId,
            },
          ).filter((plan) => {
            if (
              grade.stageId !==
              "HIGH"
            ) {
              return true;
            }

            if (
              plan.semesterId ===
              null
            ) {
              return true;
            }

            return (
              plan.semesterId ===
              state.semester
            );
          });

        map.set(
          gradeSetup.gradeId,
          plans,
        );
      }

      return map;
    }, [
      state.grades,
      state.semester,
    ]);

  useEffect(() => {
    setGradePlanSelections(
      (current) => {
        const next: GradePlanSelections =
          {};

        for (
          const gradeSetup of
          state.grades
        ) {
          const options =
            curriculumOptions.get(
              gradeSetup.gradeId,
            ) ?? [];

          const currentSourceId =
            current[
              gradeSetup.gradeId
            ];

          const currentStillValid =
            options.some(
              (plan) =>
                plan.sourceId ===
                currentSourceId,
            );

          if (
            currentSourceId &&
            currentStillValid
          ) {
            next[
              gradeSetup.gradeId
            ] = currentSourceId;

            continue;
          }

          const grade =
            getTimetableV2Grade(
              gradeSetup.gradeId,
            );

          const defaultPlan =
            getTimetableV2DefaultCurriculumPlan(
              gradeSetup.gradeId,
              grade?.stageId ===
                "HIGH"
                ? state.semester
                : null,
            );

          if (
            defaultPlan &&
            options.some(
              (plan) =>
                plan.sourceId ===
                defaultPlan.sourceId,
            )
          ) {
            next[
              gradeSetup.gradeId
            ] =
              defaultPlan.sourceId;

            continue;
          }

          if (
            options.length > 0
          ) {
            next[
              gradeSetup.gradeId
            ] =
              options[0].sourceId;
          }
        }

        return next;
      },
    );

    setPreview(null);
  }, [
    curriculumOptions,
    state.grades,
    state.semester,
  ]);

  const selectedPlans =
    useMemo(() => {
      const result =
        new Map<
          string,
          TimetableV2CurriculumPlan
        >();

      for (
        const gradeSetup of
        state.grades
      ) {
        const sourceId =
          gradePlanSelections[
            gradeSetup.gradeId
          ];

        if (!sourceId) {
          continue;
        }

        const options =
          curriculumOptions.get(
            gradeSetup.gradeId,
          ) ?? [];

        const plan =
          options.find(
            (item) =>
              item.sourceId ===
              sourceId,
          );

        if (plan) {
          result.set(
            gradeSetup.gradeId,
            plan,
          );
        }
      }

      return result;
    }, [
      curriculumOptions,
      gradePlanSelections,
      state.grades,
    ]);

  const metrics = useMemo(() => {
    const classesCount =
      state.grades.reduce(
        (sum, grade) =>
          sum +
          grade.sectionNames
            .length,
        0,
      );

    const weeklyCapacity =
      state.studyDays.length *
      state.periodsPerDay;

    let requiredPeriods = 0;

    for (
      const gradeSetup of
      state.grades
    ) {
      const plan =
        selectedPlans.get(
          gradeSetup.gradeId,
        );

      if (!plan) {
        continue;
      }

      requiredPeriods +=
        plan.totalWeeklyPeriods *
        gradeSetup.sectionNames
          .length;
    }

    const totalAvailableSlots =
      classesCount *
      weeklyCapacity;

    return {
      stagesCount:
        state.stageIds.length,

      gradesCount:
        state.grades.length,

      classesCount,

      weeklyCapacity,

      totalAvailableSlots,

      requiredPeriods,

      remainingSlots:
        totalAvailableSlots -
        requiredPeriods,
    };
  }, [
    selectedPlans,
    state,
  ]);

  const previewProject = () => {
    try {
      setPreviewError(null);

      if (
        selectedPlans.size !==
        state.grades.length
      ) {
        throw new Error(
          "اختر خطة دراسية لكل صف قبل متابعة إنشاء المشروع.",
        );
      }

      const blueprint =
        createTimetableV2ProjectBlueprint(
          {
            ...state,
            semester:
              state.semester ===
              "FIRST"
                ? "الفصل الدراسي الأول"
                : "الفصل الدراسي الثاني",
          },
        );

      let totalRequiredPeriods =
        0;

      let subjectRowsCount = 0;

      for (
        const gradeSetup of
        state.grades
      ) {
        const plan =
          selectedPlans.get(
            gradeSetup.gradeId,
          );

        if (!plan) {
          continue;
        }

        const demand =
          calculateTimetableV2PlanDemand(
            plan,
            gradeSetup
              .sectionNames.length,
          );

        totalRequiredPeriods +=
          demand.totalWeeklyPeriods;

        subjectRowsCount +=
          demand.subjects.length;
      }

      const totalAvailableSlots =
        blueprint.metrics
          .totalSchoolClassSlotsPerWeek;

      setPreview({
        classesCount:
          blueprint.metrics
            .classesCount,

        weeklyCapacityPerClass:
          blueprint.metrics
            .availablePeriodsPerClassPerWeek,

        totalAvailableSlots,

        totalRequiredPeriods,

        remainingSlots:
          totalAvailableSlots -
          totalRequiredPeriods,

        subjectRowsCount,
      });

      window.setTimeout(() => {
        document
          .getElementById(
            "timetable-v2-final-preview",
          )
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 50);
    } catch (error) {
      setPreviewError(
        error instanceof Error
          ? error.message
          : "تعذر تجهيز المشروع.",
      );
    }
  };

  return (
    <div
      dir="rtl"
      className="mx-auto max-w-7xl space-y-6 pb-16"
    >
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-l from-teal-50 via-white to-cyan-50 px-6 py-7 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-bold text-teal-700">
                نظام الجدول الجديد
              </div>

              <h1 className="text-2xl font-black tracking-tight text-slate-950 lg:text-3xl">
                إنشاء مشروع جدول
                مدرسي
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                اختر المراحل والفصول،
                وسنجهز الخطط الدراسية
                والمواد والحصص كبداية
                قابلة للتعديل بالكامل.
              </p>
            </div>

            <div className="rounded-2xl border border-teal-100 bg-white/80 px-5 py-4">
              <div className="text-xs font-medium text-slate-500">
                سعة الفصل
                الأسبوعية
              </div>

              <div className="mt-1 text-3xl font-black text-teal-700">
                {
                  metrics.weeklyCapacity
                }
              </div>

              <div className="text-xs text-slate-400">
                {
                  state.studyDays
                    .length
                }{" "}
                أيام ×{" "}
                {
                  state.periodsPerDay
                }{" "}
                حصص
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8 p-6 lg:p-8">
          <section>
            <div className="mb-4">
              <h2 className="text-lg font-black text-slate-900">
                1. بيانات المشروع
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                هذه البيانات يمكن
                تعديلها لاحقًا.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700">
                  اسم المشروع
                </span>

                <input
                  value={state.name}
                  onChange={(event) => {
                    setState(
                      (current) => ({
                        ...current,
                        name:
                          event.target
                            .value,
                      }),
                    );

                    setPreview(null);
                  }}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-50"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700">
                  العام الدراسي
                </span>

                <input
                  value={
                    state.academicYear
                  }
                  onChange={(event) => {
                    setState(
                      (current) => ({
                        ...current,
                        academicYear:
                          event.target
                            .value,
                      }),
                    );

                    setPreview(null);
                  }}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-50"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700">
                  الفصل الدراسي
                </span>

                <select
                  value={
                    state.semester
                  }
                  onChange={(event) => {
                    setState(
                      (current) => ({
                        ...current,
                        semester:
                          event.target
                            .value as TimetableV2SemesterId,
                      }),
                    );

                    setPreview(null);
                  }}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-50"
                >
                  {SEMESTER_OPTIONS.map(
                    (semester) => (
                      <option
                        key={
                          semester.id
                        }
                        value={
                          semester.id
                        }
                      >
                        {
                          semester.name
                        }
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700">
                  عدد المعلمين
                </span>

                <input
                  type="number"
                  min={1}
                  max={500}
                  value={
                    state.teacherCount
                  }
                  onChange={(event) => {
                    setState(
                      (current) => ({
                        ...current,
                        teacherCount:
                          Number(
                            event.target
                              .value,
                          ) || 0,
                      }),
                    );

                    setPreview(null);
                  }}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-50"
                />
              </label>
            </div>
          </section>

          <section className="border-t border-slate-100 pt-7">
            <div className="mb-4">
              <h2 className="text-lg font-black text-slate-900">
                2. المراحل الدراسية
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                اختيار متعدد:
                ابتدائي، متوسط، ثانوي
                أو جميعها.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {TIMETABLE_V2_STAGES.map(
                (stage) => (
                  <ToggleCard
                    key={stage.id}
                    active={state.stageIds.includes(
                      stage.id,
                    )}
                    title={stage.name}
                    subtitle={`${stage.grades.length} صفوف`}
                    onClick={() =>
                      toggleStage(
                        stage.id,
                      )
                    }
                  />
                ),
              )}
            </div>
          </section>

          <section className="border-t border-slate-100 pt-7">
            <div className="mb-4">
              <h2 className="text-lg font-black text-slate-900">
                3. أيام وحصص
                الدراسة
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                الفسحات والأوقات
                الدقيقة سنجهزها في
                شاشة مستقلة بعد إنشاء
                المشروع.
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
              <div className="flex flex-wrap gap-2">
                {TIMETABLE_V2_DEFAULT_STUDY_DAYS.map(
                  (dayId) => {
                    const active =
                      state.studyDays.includes(
                        dayId,
                      );

                    return (
                      <button
                        key={dayId}
                        type="button"
                        onClick={() =>
                          toggleStudyDay(
                            dayId,
                          )
                        }
                        className={[
                          "min-w-28 rounded-xl border px-4 py-3 text-sm font-bold transition",
                          active
                            ? "border-teal-500 bg-teal-50 text-teal-800"
                            : "border-slate-200 bg-white text-slate-500",
                        ].join(" ")}
                      >
                        {
                          TIMETABLE_V2_DAY_LABELS[
                            dayId
                          ]
                        }
                      </button>
                    );
                  },
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-2">
                  <span className="text-xs font-bold text-slate-600">
                    حصص يومية
                  </span>

                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={
                      state.periodsPerDay
                    }
                    onChange={(
                      event,
                    ) => {
                      setState(
                        (current) => ({
                          ...current,
                          periodsPerDay:
                            Number(
                              event
                                .target
                                .value,
                            ) || 0,
                        }),
                      );

                      setPreview(
                        null,
                      );
                    }}
                    className="h-11 w-full rounded-xl border border-slate-200 px-3"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-bold text-slate-600">
                    هدف أسبوعي
                  </span>

                  <input
                    type="number"
                    min={1}
                    placeholder="اختياري"
                    value={
                      state.weeklyPeriodTarget ??
                      ""
                    }
                    onChange={(
                      event,
                    ) => {
                      setState(
                        (current) => ({
                          ...current,
                          weeklyPeriodTarget:
                            event.target
                              .value
                              ? Number(
                                  event
                                    .target
                                    .value,
                                )
                              : null,
                        }),
                      );

                      setPreview(
                        null,
                      );
                    }}
                    className="h-11 w-full rounded-xl border border-slate-200 px-3"
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="border-t border-slate-100 pt-7">
            <div className="mb-4">
              <h2 className="text-lg font-black text-slate-900">
                4. الصفوف والفصول
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                الصفوف تظهر تلقائيًا.
                حدد عدد الفصول لكل صف.
              </p>
            </div>

            {state.grades.length ===
            0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                <div className="font-bold text-slate-700">
                  اختر مرحلة دراسية
                  أولًا
                </div>

                <div className="mt-1 text-sm text-slate-500">
                  سنجهز صفوفها هنا
                  تلقائيًا.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {state.grades.map(
                  (
                    gradeSetup,
                  ) => {
                    const grade =
                      getTimetableV2Grade(
                        gradeSetup.gradeId,
                      );

                    if (!grade) {
                      return null;
                    }

                    return (
                      <div
                        key={
                          gradeSetup.gradeId
                        }
                        className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                          <div className="min-w-44">
                            <div className="font-black text-slate-900">
                              {
                                grade.name
                              }
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {
                                gradeSetup
                                  .sectionNames
                                  .length
                              }{" "}
                              فصول
                            </div>
                          </div>

                          <label className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-600">
                              عدد الفصول
                            </span>

                            <select
                              value={
                                gradeSetup
                                  .sectionNames
                                  .length
                              }
                              onChange={(
                                event,
                              ) =>
                                updateSectionCount(
                                  gradeSetup.gradeId,
                                  Number(
                                    event
                                      .target
                                      .value,
                                  ),
                                )
                              }
                              className="h-10 rounded-xl border border-slate-200 bg-white px-3"
                            >
                              {TIMETABLE_V2_DEFAULT_SECTION_NAMES.map(
                                (
                                  _,
                                  index,
                                ) => (
                                  <option
                                    key={
                                      index
                                    }
                                    value={
                                      index +
                                      1
                                    }
                                  >
                                    {index +
                                      1}
                                  </option>
                                ),
                              )}
                            </select>
                          </label>

                          <div className="flex flex-1 flex-wrap gap-2">
                            {gradeSetup.sectionNames.map(
                              (
                                sectionName,
                                index,
                              ) => (
                                <input
                                  key={
                                    index
                                  }
                                  value={
                                    sectionName
                                  }
                                  onChange={(
                                    event,
                                  ) =>
                                    renameSection(
                                      gradeSetup.gradeId,
                                      index,
                                      event
                                        .target
                                        .value,
                                    )
                                  }
                                  aria-label={`فصل ${grade.name}`}
                                  className="h-10 w-16 rounded-xl border border-slate-200 bg-white text-center font-bold outline-none focus:border-teal-500"
                                />
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </section>

          <section className="border-t border-slate-100 pt-7">
            <div className="mb-5">
              <h2 className="text-lg font-black text-slate-900">
                5. الخطط الدراسية
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                اختر خطة كل صف.
                المواد والحصص مأخوذة
                من الكتالوج الذي
                جهزناه ويمكن تعديلها
                لاحقًا بعد إنشاء
                المشروع.
              </p>
            </div>

            {state.grades.length ===
            0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                اختر المراحل والصفوف
                أولًا.
              </div>
            ) : (
              <div className="space-y-6">
                {state.grades.map(
                  (
                    gradeSetup,
                  ) => {
                    const grade =
                      getTimetableV2Grade(
                        gradeSetup.gradeId,
                      );

                    if (!grade) {
                      return null;
                    }

                    const options =
                      curriculumOptions.get(
                        gradeSetup.gradeId,
                      ) ?? [];

                    const selectedSourceId =
                      gradePlanSelections[
                        gradeSetup.gradeId
                      ] ?? "";

                    const selectedPlan =
                      selectedPlans.get(
                        gradeSetup.gradeId,
                      );

                    return (
                      <div
                        key={
                          gradeSetup.gradeId
                        }
                        className="rounded-3xl border border-slate-200 bg-slate-50/40 p-4 lg:p-5"
                      >
                        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                          <div>
                            <div className="text-lg font-black text-slate-900">
                              {
                                grade.name
                              }
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {
                                gradeSetup
                                  .sectionNames
                                  .length
                              }{" "}
                              فصول
                            </div>
                          </div>

                          <label className="w-full max-w-xl space-y-2">
                            <span className="text-xs font-bold text-slate-600">
                              الخطة
                              الدراسية
                            </span>

                            <select
                              value={
                                selectedSourceId
                              }
                              onChange={(
                                event,
                              ) => {
                                setGradePlanSelections(
                                  (
                                    current,
                                  ) => ({
                                    ...current,
                                    [gradeSetup.gradeId]:
                                      event
                                        .target
                                        .value,
                                  }),
                                );

                                setPreview(
                                  null,
                                );
                              }}
                              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none focus:border-teal-500"
                            >
                              {options.length ===
                              0 ? (
                                <option value="">
                                  لا توجد
                                  خطة
                                </option>
                              ) : null}

                              {options.map(
                                (
                                  plan,
                                ) => (
                                  <option
                                    key={
                                      plan.sourceId
                                    }
                                    value={
                                      plan.sourceId
                                    }
                                  >
                                    {
                                      plan.sourceName
                                    }{" "}
                                    —{" "}
                                    {
                                      plan.totalWeeklyPeriods
                                    }{" "}
                                    حصة
                                  </option>
                                ),
                              )}
                            </select>
                          </label>
                        </div>

                        {selectedPlan ? (
                          <SubjectPlanTable
                            plan={
                              selectedPlan
                            }
                            sectionCount={
                              gradeSetup
                                .sectionNames
                                .length
                            }
                          />
                        ) : (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
                            لا توجد خطة
                            مختارة لهذا
                            الصف.
                          </div>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </section>

          <section className="border-t border-slate-100 pt-7">
            <div className="mb-4">
              <h2 className="text-lg font-black text-slate-900">
                ملخص المشروع
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <MetricCard
                label="المراحل"
                value={
                  metrics.stagesCount
                }
              />

              <MetricCard
                label="الصفوف"
                value={
                  metrics.gradesCount
                }
              />

              <MetricCard
                label="الفصول"
                value={
                  metrics.classesCount
                }
              />

              <MetricCard
                label="المعلمون"
                value={
                  state.teacherCount
                }
              />

              <MetricCard
                label="الحصص المطلوبة"
                value={
                  metrics.requiredPeriods
                }
              />

              <MetricCard
                label="الخانات المتبقية"
                value={
                  metrics.remainingSlots
                }
                tone={
                  metrics.remainingSlots >=
                  0
                    ? "success"
                    : "warning"
                }
              />
            </div>
          </section>

          {previewError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-800">
              {previewError}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-6 text-slate-500">
              لم نحفظ شيئًا في قاعدة
              البيانات حتى الآن.
            </p>

            <button
              type="button"
              onClick={
                previewProject
              }
              className="h-12 rounded-xl bg-teal-700 px-7 font-bold text-white shadow-sm transition hover:bg-teal-800"
            >
              تجهيز المشروع
            </button>
          </div>
        </div>
      </section>

      {preview ? (
        <section
          id="timetable-v2-final-preview"
          className="scroll-mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm lg:p-8"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
                البيانات جاهزة
              </div>

              <h2 className="mt-3 text-2xl font-black text-slate-950">
                المشروع جاهز
                للإنشاء
              </h2>

              <p className="mt-2 text-sm leading-7 text-slate-600">
                تحققنا من المراحل
                والصفوف والفصول والخطط
                الدراسية والحصص.
                الخطوة التالية ستكون
                حفظ المشروع فعليًا في
                قاعدة البيانات.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-3">
                <div className="text-xl font-black">
                  {
                    preview.classesCount
                  }
                </div>
                <div className="text-[11px] text-slate-500">
                  فصل
                </div>
              </div>

              <div className="rounded-2xl bg-white p-3">
                <div className="text-xl font-black">
                  {
                    preview.totalRequiredPeriods
                  }
                </div>
                <div className="text-[11px] text-slate-500">
                  حصة مطلوبة
                </div>
              </div>

              <div className="rounded-2xl bg-white p-3">
                <div className="text-xl font-black">
                  {
                    preview.remainingSlots
                  }
                </div>
                <div className="text-[11px] text-slate-500">
                  خانة متبقية
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-emerald-200 bg-white px-5 py-4 text-sm text-slate-600">
            في الخطوة القادمة زر
            الإنشاء سيبني المشروع
            والفصول والمواد وخطط
            الحصص في Transaction
            واحدة آمنة، ثم ينقلك إلى
            شاشة المعلمين والإسناد.
          </div>
        </section>
      ) : null}
    </div>
  );
}
