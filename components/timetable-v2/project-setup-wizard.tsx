"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  TIMETABLE_V2_CURRICULUM_TRACK_LABELS,
  TIMETABLE_V2_DAY_LABELS,
  TIMETABLE_V2_DEFAULT_SECTION_NAMES,
  TIMETABLE_V2_DEFAULT_STUDY_DAYS,
  TIMETABLE_V2_STAGES,
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

type ClassPlanSelections = Record<
  string,
  string
>;

type ClassPlanResolution = {
  classKey: string;
  gradeId: string;
  gradeName: string;
  stageId: TimetableV2StageId;
  sectionIndex: number;
  sectionName: string;
  className: string;
  planSourceId: string;
  plan: TimetableV2CurriculumPlan;
};

type WizardStepId =
  | 1
  | 2
  | 3
  | 4
  | 5;

type WizardStep = {
  id: WizardStepId;
  title: string;
  shortTitle: string;
  description: string;
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

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 1,
    title: "معلومات المشروع",
    shortTitle: "المشروع",
    description:
      "اسم الجدول والعام والفصل الدراسي والعدد المتوقع للمعلمين.",
  },
  {
    id: 2,
    title: "الهيكل الدراسي",
    shortTitle: "الفصول",
    description:
      "اختر المراحل ثم حدد عدد الفصول وأسمائها لكل صف.",
  },
  {
    id: 3,
    title: "الخطة والمواد",
    shortTitle: "المواد",
    description:
      "راجع الخطة الدراسية التي سيبدأ منها كل فصل.",
  },
  {
    id: 4,
    title: "أيام وحصص الدراسة",
    shortTitle: "الأوقات",
    description:
      "حدد أيام الدراسة وعدد الحصص اليومية قبل إنشاء المشروع.",
  },
  {
    id: 5,
    title: "المراجعة والإنشاء",
    shortTitle: "المراجعة",
    description:
      "راجع ملخص المشروع وتأكد أن السعة والخطة مناسبتان.",
  },
];

function getClassSetupKey(
  gradeId: string,
  sectionIndex: number,
) {
  return `${gradeId}:${sectionIndex}`;
}

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
          <div className="font-black text-slate-900">
            {title}
          </div>

          {subtitle ? (
            <div className="mt-1 text-xs leading-5 text-slate-500">
              {subtitle}
            </div>
          ) : null}
        </div>

        <span
          className={[
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-black",
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
      <div className="text-xs font-bold text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-2xl font-black text-slate-950">
        {value}
      </div>

      {hint ? (
        <div className="mt-1 text-xs leading-5 text-slate-500">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function StepRail({
  currentStep,
  completedSteps,
  onSelect,
}: {
  currentStep: WizardStepId;
  completedSteps: Set<WizardStepId>;
  onSelect: (
    step: WizardStepId,
  ) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[760px] grid-cols-5 gap-2">
        {WIZARD_STEPS.map((step) => {
          const active =
            currentStep === step.id;
          const completed =
            completedSteps.has(step.id);

          return (
            <button
              key={step.id}
              type="button"
              onClick={() =>
                onSelect(step.id)
              }
              className={[
                "group rounded-2xl border px-3 py-3 text-right transition",
                active
                  ? "border-teal-500 bg-teal-50 shadow-sm"
                  : completed
                    ? "border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
              ].join(" ")}
            >
              <div className="flex items-center gap-2">
                <span
                  className={[
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-black",
                    active
                      ? "border-teal-600 bg-teal-600 text-white"
                      : completed
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-300 bg-white text-slate-500",
                  ].join(" ")}
                >
                  {completed && !active
                    ? "✓"
                    : step.id}
                </span>

                <div className="min-w-0">
                  <div
                    className={[
                      "truncate text-xs font-black",
                      active
                        ? "text-teal-800"
                        : completed
                          ? "text-emerald-800"
                          : "text-slate-700",
                    ].join(" ")}
                  >
                    {step.shortTitle}
                  </div>

                  <div className="mt-0.5 text-[10px] font-bold text-slate-400">
                    الخطوة {step.id}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepHeading({
  step,
}: {
  step: WizardStep;
}) {
  return (
    <div className="mb-6">
      <div className="text-xs font-black text-teal-700">
        الخطوة {step.id} من 5
      </div>

      <h2 className="mt-1 text-xl font-black text-slate-950">
        {step.title}
      </h2>

      <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
        {step.description}
      </p>
    </div>
  );
}

function SubjectPlanPreview({
  plan,
}: {
  plan: TimetableV2CurriculumPlan;
}) {
  return (
    <details className="group mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <div>
          <div className="text-sm font-black text-slate-800">
            عرض تفاصيل المواد
          </div>

          <div className="mt-1 text-sm font-medium text-slate-500">
            {plan.subjects.length} مواد •{" "}
            {plan.totalWeeklyPeriods} حصة أسبوعيًا
          </div>
        </div>

        <span className="text-sm font-black text-teal-700 group-open:hidden">
          فتح
        </span>

        <span className="hidden text-sm font-black text-teal-700 group-open:inline">
          إخفاء
        </span>
      </summary>

      <div className="border-t border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
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
              </tr>
            </thead>

            <tbody>
              {plan.subjects.map(
                (subject, index) => (
                  <tr
                    key={`${subject.sourceName}-${index}`}
                    className="border-t border-slate-100"
                  >
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">
                        {
                          subject.canonicalName
                        }
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center text-slate-600">
                      {subject.oddClasses}
                    </td>
                    <td className="px-3 py-3 text-center text-slate-600">
                      {subject.evenClasses}
                    </td>
                    <td className="px-3 py-3 text-center font-black text-teal-700">
                      {subject.weeklyPeriods}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}

export function TimetableV2ProjectSetupWizard() {
  const router = useRouter();

  const [
    currentStep,
    setCurrentStep,
  ] = useState<WizardStepId>(1);

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
    classPlanSelections,
    setClassPlanSelections,
  ] = useState<ClassPlanSelections>(
    {},
  );

  const [
    feedback,
    setFeedback,
  ] = useState<string | null>(
    null,
  );

  const [
    creating,
    setCreating,
  ] = useState(false);

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

    setFeedback(null);
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

    setFeedback(null);
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
        (grade) => {
          if (
            grade.gradeId !==
            gradeId
          ) {
            return grade;
          }

          const existing =
            grade.sectionNames;

          const sectionNames =
            Array.from(
              {
                length: safeCount,
              },
              (_, index) => {
                const defaultName =
                  TIMETABLE_V2_DEFAULT_SECTION_NAMES[
                    index
                  ];

                return existing[
                  index
                ]?.trim()
                  ? existing[index]
                  : defaultName;
              },
            );

          return {
            ...grade,
            sectionNames,
          };
        },
      ),
    }));

    setFeedback(null);
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

    setFeedback(null);
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
    setClassPlanSelections(
      (current) => {
        const next: ClassPlanSelections =
          {};

        for (
          const gradeSetup of
          state.grades
        ) {
          const grade =
            getTimetableV2Grade(
              gradeSetup.gradeId,
            );

          const options =
            curriculumOptions.get(
              gradeSetup.gradeId,
            ) ?? [];

          for (
            let sectionIndex = 0;
            sectionIndex <
            gradeSetup.sectionNames.length;
            sectionIndex += 1
          ) {
            const classKey =
              getClassSetupKey(
                gradeSetup.gradeId,
                sectionIndex,
              );

            const currentSourceId =
              current[classKey];

            if (
              currentSourceId &&
              options.some(
                (plan) =>
                  plan.sourceId ===
                  currentSourceId,
              )
            ) {
              next[classKey] =
                currentSourceId;
              continue;
            }

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
              next[classKey] =
                defaultPlan.sourceId;
              continue;
            }

            if (
              options.length > 0
            ) {
              next[classKey] =
                options[0].sourceId;
            }
          }
        }

        return next;
      },
    );

    setFeedback(null);
  }, [
    curriculumOptions,
    state.grades,
    state.semester,
  ]);

  const classResolutions =
    useMemo(() => {
      const result: ClassPlanResolution[] =
        [];

      for (
        const gradeSetup of
        state.grades
      ) {
        const grade =
          getTimetableV2Grade(
            gradeSetup.gradeId,
          );

        if (!grade) {
          continue;
        }

        const options =
          curriculumOptions.get(
            gradeSetup.gradeId,
          ) ?? [];

        gradeSetup.sectionNames.forEach(
          (
            sectionName,
            sectionIndex,
          ) => {
            const classKey =
              getClassSetupKey(
                gradeSetup.gradeId,
                sectionIndex,
              );

            const sourceId =
              classPlanSelections[
                classKey
              ];

            if (!sourceId) {
              return;
            }

            const plan =
              options.find(
                (item) =>
                  item.sourceId ===
                  sourceId,
              );

            if (!plan) {
              return;
            }

            result.push({
              classKey,
              gradeId: grade.id,
              gradeName: grade.name,
              stageId: grade.stageId,
              sectionIndex,
              sectionName,
              className: `${grade.name} ${sectionName}`,
              planSourceId:
                plan.sourceId,
              plan,
            });
          },
        );
      }

      return result;
    }, [
      classPlanSelections,
      curriculumOptions,
      state.grades,
    ]);

  const metrics = useMemo(() => {
    const classesCount =
      state.grades.reduce(
        (sum, grade) =>
          sum +
          grade.sectionNames.length,
        0,
      );

    const weeklyCapacity =
      state.studyDays.length *
      state.periodsPerDay;

    let requiredPeriods = 0;

    for (
      const resolution of
      classResolutions
    ) {
      requiredPeriods +=
        resolution.plan
          .totalWeeklyPeriods;
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
    classResolutions,
    state,
  ]);

  const expectedClassCount =
    useMemo(
      () =>
        state.grades.reduce(
          (sum, grade) =>
            sum +
            grade.sectionNames.length,
          0,
        ),
      [state.grades],
    );

  const stepValidation =
    useMemo(() => {
      const step1 =
        state.name.trim().length >
          0 &&
        state.academicYear.trim()
          .length > 0 &&
        state.teacherCount > 0;

      const step2 =
        state.stageIds.length > 0 &&
        state.grades.length > 0 &&
        state.grades.every(
          (grade) =>
            grade.sectionNames.length >
              0 &&
            grade.sectionNames.every(
              (name) =>
                name.trim().length > 0,
            ),
        );

      const step3 =
        expectedClassCount > 0 &&
        classResolutions.length ===
          expectedClassCount;

      const step4 =
        state.studyDays.length > 0 &&
        state.periodsPerDay > 0;

      const step5 =
        step1 &&
        step2 &&
        step3 &&
        step4 &&
        metrics.remainingSlots >= 0;

      return {
        1: step1,
        2: step2,
        3: step3,
        4: step4,
        5: step5,
      } satisfies Record<
        WizardStepId,
        boolean
      >;
    }, [
      classResolutions.length,
      expectedClassCount,
      metrics.remainingSlots,
      state,
    ]);

  const completedSteps =
    useMemo(() => {
      const result =
        new Set<WizardStepId>();

      for (
        const step of WIZARD_STEPS
      ) {
        if (
          stepValidation[step.id]
        ) {
          result.add(step.id);
        }
      }

      return result;
    }, [stepValidation]);

  const getStepError = (
    step: WizardStepId,
  ) => {
    if (
      step === 1
    ) {
      if (!state.name.trim()) {
        return "اكتب اسم المشروع.";
      }

      if (
        !state.academicYear.trim()
      ) {
        return "اكتب العام الدراسي.";
      }

      if (
        state.teacherCount <= 0
      ) {
        return "حدد العدد المتوقع للمعلمين.";
      }
    }

    if (
      step === 2
    ) {
      if (
        state.stageIds.length === 0
      ) {
        return "اختر مرحلة دراسية واحدة على الأقل.";
      }

      const hasEmptySection =
        state.grades.some(
          (grade) =>
            grade.sectionNames.some(
              (name) =>
                !name.trim(),
            ),
        );

      if (hasEmptySection) {
        return "تأكد من أسماء جميع الفصول.";
      }
    }

    if (
      step === 3 &&
      classResolutions.length !==
        expectedClassCount
    ) {
      return "اختر خطة دراسية لكل فصل قبل المتابعة.";
    }

    if (
      step === 4
    ) {
      if (
        state.studyDays.length === 0
      ) {
        return "اختر يوم دراسة واحدًا على الأقل.";
      }

      if (
        state.periodsPerDay <= 0
      ) {
        return "حدد عدد الحصص اليومية.";
      }
    }

    if (
      step === 5 &&
      metrics.remainingSlots < 0
    ) {
      return "عدد الحصص المطلوبة أكبر من السعة الأسبوعية المتاحة. راجع الأيام أو عدد الحصص اليومية أو الخطط الدراسية.";
    }

    return null;
  };

  const goNext = () => {
    const error =
      getStepError(
        currentStep,
      );

    if (error) {
      setFeedback(error);
      return;
    }

    setFeedback(null);

    if (
      currentStep < 5
    ) {
      setCurrentStep(
        (currentStep +
          1) as WizardStepId,
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  const goBack = () => {
    setFeedback(null);

    if (
      currentStep > 1
    ) {
      setCurrentStep(
        (currentStep -
          1) as WizardStepId,
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  const selectStep = (
    step: WizardStepId,
  ) => {
    if (
      step <= currentStep
    ) {
      setCurrentStep(step);
      setFeedback(null);
      return;
    }

    for (
      let id = 1;
      id < step;
      id += 1
    ) {
      const candidate =
        id as WizardStepId;

      if (
        !stepValidation[candidate]
      ) {
        setCurrentStep(candidate);
        setFeedback(
          getStepError(candidate),
        );
        return;
      }
    }

    setCurrentStep(step);
    setFeedback(null);
  };

  const createProject = async () => {
    if (creating) {
      return;
    }

    for (
      const step of WIZARD_STEPS
    ) {
      const error =
        getStepError(step.id);

      if (error) {
        setCurrentStep(step.id);
        setFeedback(error);
        return;
      }
    }

    try {
      setCreating(true);
      setFeedback(null);

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

      const response = await fetch(
        "/api/dashboard/principal/timetable-v2/projects",
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            name: state.name,
            academicYear:
              state.academicYear,
            semester:
              state.semester,
            stageIds:
              state.stageIds,
            teacherCount:
              state.teacherCount,
            weeklyPeriodTarget:
              state.weeklyPeriodTarget,
            studyDays:
              state.studyDays,
            periodsPerDay:
              state.periodsPerDay,
            classes:
              classResolutions.map(
                (resolution) => ({
                  gradeId:
                    resolution.gradeId,
                  sectionIndex:
                    resolution.sectionIndex,
                  sectionName:
                    resolution.sectionName,
                  planSourceId:
                    resolution.planSourceId,
                }),
              ),
          }),
        },
      );

      const data =
        await response
          .json()
          .catch(() => null);

      if (
        !response.ok ||
        !data?.success ||
        !data?.project?.id
      ) {
        throw new Error(
          data?.error ||
            "تعذر إنشاء المشروع.",
        );
      }

      router.push(
        `/dashboard/timetable-v2/${data.project.id}`,
      );

      router.refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "تعذر إنشاء المشروع.",
      );
    } finally {
      setCreating(false);
    }
  };

  const activeStep =
    WIZARD_STEPS.find(
      (step) =>
        step.id === currentStep,
    ) ?? WIZARD_STEPS[0];

  return (
    <div
      dir="rtl"
      className="mx-auto max-w-7xl pb-16"
    >
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-l from-teal-50 via-white to-cyan-50 px-5 py-6 sm:px-6 lg:px-8 lg:py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-black text-teal-700">
                إعداد جدول جديد
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 lg:text-3xl">
                إنشاء مشروع جدول مدرسي
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                جهّز المشروع خطوة بخطوة. يمكنك مراجعة أي خطوة قبل الحفظ، ولن يتم إنشاء شيء في قاعدة البيانات حتى الخطوة الأخيرة.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:min-w-[280px]">
              <div className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
                <div className="text-[11px] font-bold text-slate-500">
                  التقدم
                </div>

                <div className="mt-1 text-2xl font-black text-teal-700">
                  {currentStep}/5
                </div>
              </div>

              <div className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm">
                <div className="text-[11px] font-bold text-slate-500">
                  السعة الحالية
                </div>

                <div className="mt-1 text-2xl font-black text-slate-950">
                  {
                    metrics.weeklyCapacity
                  }
                </div>

                <div className="text-[10px] text-slate-400">
                  حصة لكل فصل أسبوعيًا
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <StepRail
              currentStep={
                currentStep
              }
              completedSteps={
                completedSteps
              }
              onSelect={
                selectStep
              }
            />
          </div>
        </div>

        <div className="p-5 sm:p-6 lg:p-8">
          <StepHeading
            step={activeStep}
          />

          {currentStep === 1 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-black text-slate-700">
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
                    setFeedback(null);
                  }}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-50"
                  placeholder="مثال: جدول الفصل الدراسي الأول"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-slate-700">
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
                    setFeedback(null);
                  }}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-50"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-black text-slate-700">
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
                    setFeedback(null);
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
                <span className="text-sm font-black text-slate-700">
                  العدد المتوقع للمعلمين
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
                    setFeedback(null);
                  }}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-50"
                />

                <span className="block text-[11px] leading-5 text-slate-400">
                  قيمة إرشادية لمتابعة اكتمال إدخال المعلمين بعد إنشاء المشروع.
                </span>
              </label>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="space-y-7">
              <section>
                <div className="mb-4">
                  <h3 className="text-sm font-black text-slate-900">
                    المراحل الدراسية
                  </h3>

                  <p className="mt-1 text-xs leading-6 text-slate-500">
                    اختر مرحلة واحدة أو أكثر. ستظهر الصفوف التابعة لها تلقائيًا.
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
                        title={
                          stage.name
                        }
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

              <section className="border-t border-slate-100 pt-6">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      الصفوف والفصول
                    </h3>
                    <p className="mt-1 text-xs leading-6 text-slate-500">
                      حدد عدد الفصول لكل صف، ويمكنك تعديل حرف الفصل مباشرة.
                    </p>
                  </div>

                  {metrics.classesCount >
                  0 ? (
                    <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-700">
                      {
                        metrics.classesCount
                      }{" "}
                      فصول
                    </span>
                  ) : null}
                </div>

                {state.grades.length ===
                0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                    <div className="font-black text-slate-700">
                      اختر مرحلة دراسية أولًا
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      سنجهز صفوفها هنا تلقائيًا.
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
                            className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4"
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
                                <span className="text-xs font-black text-slate-600">
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
                                      className="h-10 w-16 rounded-xl border border-slate-200 bg-white text-center font-black outline-none transition focus:border-teal-500"
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
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-6 text-sky-800">
                اختر الخطة المناسبة لكل فصل. نعرض تفاصيل المواد عند الطلب فقط حتى تبقى الصفحة خفيفة وواضحة.
              </div>

              {state.grades.map(
                (gradeSetup) => {
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

                  return (
                    <section
                      key={
                        gradeSetup.gradeId
                      }
                      className="rounded-3xl border border-slate-200 bg-slate-50/40 p-4 lg:p-5"
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-black text-slate-950">
                            {grade.name}
                          </h3>
                          <p className="mt-1 text-xs text-slate-500">
                            {
                              gradeSetup
                                .sectionNames
                                .length
                            }{" "}
                            فصول
                          </p>
                        </div>

                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-200">
                          {
                            options.length
                          }{" "}
                          خطط متاحة
                        </span>
                      </div>

                      <div className="space-y-3">
                        {gradeSetup.sectionNames.map(
                          (
                            sectionName,
                            sectionIndex,
                          ) => {
                            const classKey =
                              getClassSetupKey(
                                gradeSetup.gradeId,
                                sectionIndex,
                              );

                            const selectedSourceId =
                              classPlanSelections[
                                classKey
                              ] ?? "";

                            const resolution =
                              classResolutions.find(
                                (item) =>
                                  item.classKey ===
                                  classKey,
                              );

                            return (
                              <div
                                key={
                                  classKey
                                }
                                className="rounded-2xl border border-slate-200 bg-white p-4"
                              >
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                  <div className="min-w-44">
                                    <div className="font-black text-slate-950">
                                      {
                                        grade.name
                                      }{" "}
                                      {
                                        sectionName
                                      }
                                    </div>

                                    {resolution ? (
                                      <div className="mt-1 text-sm font-bold text-teal-700">
                                        {
                                          resolution
                                            .plan
                                            .totalWeeklyPeriods
                                        }{" "}
                                        حصة أسبوعيًا
                                      </div>
                                    ) : (
                                      <div className="mt-1 text-sm font-bold text-amber-700">
                                        لم تحدد خطة بعد
                                      </div>
                                    )}
                                  </div>

                                  <label className="w-full max-w-xl space-y-2">
                                    <span className="text-xs font-black text-slate-600">
                                      الخطة الدراسية
                                    </span>

                                    <select
                                      value={
                                        selectedSourceId
                                      }
                                      onChange={(
                                        event,
                                      ) => {
                                        setClassPlanSelections(
                                          (
                                            current,
                                          ) => ({
                                            ...current,
                                            [classKey]:
                                              event
                                                .target
                                                .value,
                                          }),
                                        );
                                        setFeedback(
                                          null,
                                        );
                                      }}
                                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base font-bold outline-none transition focus:border-teal-500"
                                    >
                                      {options.length ===
                                      0 ? (
                                        <option value="">
                                          لا توجد خطة
                                        </option>
                                      ) : null}

                                      {options.map(
                                        (plan) => (
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

                                {resolution ? (
                                  <div className="mt-3">
                                    <div className="flex flex-wrap gap-2">
                                      <span className="rounded-full bg-teal-50 px-3 py-1.5 text-sm font-black text-teal-700">
                                        {
                                          TIMETABLE_V2_CURRICULUM_TRACK_LABELS[
                                            resolution
                                              .plan
                                              .trackId
                                          ]
                                        }
                                      </span>

                                      <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-black text-slate-700">
                                        {
                                          resolution
                                            .plan
                                            .subjects
                                            .length
                                        }{" "}
                                        مواد
                                      </span>
                                    </div>

                                    <SubjectPlanPreview
                                      plan={
                                        resolution.plan
                                      }
                                    />
                                  </div>
                                ) : null}
                              </div>
                            );
                          },
                        )}
                      </div>
                    </section>
                  );
                },
              )}
            </div>
          ) : null}

          {currentStep === 4 ? (
            <div className="space-y-7">
              <section>
                <h3 className="text-sm font-black text-slate-900">
                  أيام الدراسة
                </h3>

                <p className="mt-1 text-xs leading-6 text-slate-500">
                  اختر الأيام التي ستدخل في الجدول. إعداد الفسحة والأوقات الدقيقة يبقى داخل شاشة القيود والأوقات بعد إنشاء المشروع.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
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
                            "min-w-28 rounded-xl border px-4 py-3 text-sm font-black transition",
                            active
                              ? "border-teal-500 bg-teal-50 text-teal-800"
                              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
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
              </section>

              <section className="border-t border-slate-100 pt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-black text-slate-700">
                      عدد الحصص اليومية
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
                        setFeedback(
                          null,
                        );
                      }}
                      className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-50"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-black text-slate-700">
                      الهدف الأسبوعي
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
                        setFeedback(
                          null,
                        );
                      }}
                      className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-50"
                    />

                    <span className="block text-[11px] leading-5 text-slate-400">
                      قيمة إرشادية فقط وليست قيدًا ثابتًا على المحرك.
                    </span>
                  </label>
                </div>
              </section>

              <div className="grid gap-3 sm:grid-cols-3">
                <MetricCard
                  label="أيام الدراسة"
                  value={
                    state.studyDays.length
                  }
                />
                <MetricCard
                  label="حصص يومية"
                  value={
                    state.periodsPerDay
                  }
                />
                <MetricCard
                  label="سعة الفصل أسبوعيًا"
                  value={
                    metrics.weeklyCapacity
                  }
                  tone="success"
                />
              </div>
            </div>
          ) : null}

          {currentStep === 5 ? (
            <div className="space-y-6">
              <div
                className={[
                  "rounded-2xl border px-5 py-4",
                  metrics.remainingSlots >=
                  0
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-rose-200 bg-rose-50",
                ].join(" ")}
              >
                <div
                  className={[
                    "text-sm font-black",
                    metrics.remainingSlots >=
                    0
                      ? "text-emerald-800"
                      : "text-rose-800",
                  ].join(" ")}
                >
                  {metrics.remainingSlots >=
                  0
                    ? "البيانات الأساسية جاهزة"
                    : "السعة الأسبوعية تحتاج مراجعة"}
                </div>

                <p className="mt-1 text-xs leading-6 text-slate-600">
                  {metrics.remainingSlots >=
                  0
                    ? "بعد الإنشاء ستنتقل إلى إدارة المعلمين ثم الإسنادات، ولن يبدأ التوليد قبل اجتياز فحص الجاهزية."
                    : "عدد الحصص المطلوبة أكبر من الخانات المتاحة. ارجع إلى الأيام والحصص أو راجع الخطط الدراسية."}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
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
                  label="المعلمون المتوقعون"
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
                  label="الخانات المتاحة"
                  value={
                    metrics.totalAvailableSlots
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

              <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-5">
                <h3 className="text-sm font-black text-slate-900">
                  ملخص المشروع
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <div className="text-[11px] font-bold text-slate-400">
                      اسم المشروع
                    </div>
                    <div className="mt-1 font-black text-slate-900">
                      {state.name}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold text-slate-400">
                      العام والفصل
                    </div>
                    <div className="mt-1 font-black text-slate-900">
                      {
                        state.academicYear
                      }{" "}
                      •{" "}
                      {
                        SEMESTER_OPTIONS.find(
                          (item) =>
                            item.id ===
                            state.semester,
                        )?.name
                      }
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold text-slate-400">
                      المراحل
                    </div>
                    <div className="mt-1 font-black text-slate-900">
                      {state.stageIds
                        .map(
                          (stageId) =>
                            TIMETABLE_V2_STAGES.find(
                              (stage) =>
                                stage.id ===
                                stageId,
                            )?.shortName,
                        )
                        .filter(Boolean)
                        .join("، ")}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold text-slate-400">
                      أيام الدراسة
                    </div>
                    <div className="mt-1 font-black text-slate-900">
                      {
                        state.studyDays.length
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

              <div className="rounded-3xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h3 className="text-sm font-black text-slate-900">
                    خطط الفصول
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    مراجعة سريعة لما سيتم إنشاؤه.
                  </p>
                </div>

                <div className="divide-y divide-slate-100">
                  {classResolutions.map(
                    (resolution) => (
                      <div
                        key={
                          resolution.classKey
                        }
                        className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="font-black text-slate-900">
                            {
                              resolution.className
                            }
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {
                              resolution
                                .plan
                                .sourceName
                            }
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 text-[11px] font-black">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                            {
                              resolution
                                .plan
                                .subjects
                                .length
                            }{" "}
                            مواد
                          </span>

                          <span className="rounded-full bg-teal-50 px-3 py-1 text-teal-700">
                            {
                              resolution
                                .plan
                                .totalWeeklyPeriods
                            }{" "}
                            حصة
                          </span>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {feedback ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold leading-6 text-amber-800">
              {feedback}
            </div>
          ) : null}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs leading-6 text-slate-500">
              {currentStep === 5
                ? "لن يتم إنشاء المشروع إلا بعد الضغط على زر الإنشاء."
                : "يمكنك الرجوع لأي خطوة مكتملة بدون فقدان المدخلات الحالية."}
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={goBack}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  السابق
                </button>
              ) : null}

              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="h-11 rounded-xl bg-teal-700 px-6 text-sm font-black text-white shadow-sm transition hover:bg-teal-800"
                >
                  التالي
                </button>
              ) : (
                <button
                  type="button"
                  disabled={
                    creating ||
                    !stepValidation[5]
                  }
                  onClick={
                    createProject
                  }
                  className="h-11 rounded-xl bg-emerald-700 px-6 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating
                    ? "جاري إنشاء المشروع..."
                    : "إنشاء المشروع وبدء الإعداد"}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
