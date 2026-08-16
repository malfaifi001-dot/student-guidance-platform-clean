"use client";

import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  TIMETABLE_V3_DAY_OPTIONS,
  type TimetableV3DayId,
  type TimetableV3SetupWorkspace,
} from "@/lib/timetable-v3/project-setup-types";

import {
  ARABIC_CLASS_SECTION_LETTERS,
  TIMETABLE_V3_STAGES,
  buildTimetableV3GradeClasses,
  resolveTimetableV3ClassClassification,
  type TimetableV3ClassMappings,
  type TimetableV3StageId,
} from "@/lib/timetable-v3/school-setup-catalog";

import {
  TimetableV3SmartImportPanel,
} from "@/components/timetable-v3/smart-import-panel";

import type {
  TimetableAiImportResult,
} from "@/lib/timetable-v3/ai-import/ai-import-types";

type Props = {
  projectId: string;
};

type TeacherRow = {
  name: string;
  specialty: string;
  maxWeeklyLoad: number;
};

type PeriodRow = {
  label: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
};

type GradeCountMap =
  Record<
    string,
    number
  >;

type SubjectBankItem = {
  id: string;
  name: string;
  stageIds: string[];
};

const STEPS = [
  "الأيام",
  "الحصص",
  "الفصول",
  "المواد",
  "المعلمين",
  "المراجعة",
] as const;

export function TimetableV3ProjectSetupWizard(
  {
    projectId,
  }: Props,
) {
  const router =
    useRouter();

  const [
    workspace,
    setWorkspace,
  ] = useState<
    TimetableV3SetupWorkspace |
    null
  >(
    null,
  );

  const [
    step,
    setStep,
  ] = useState(
    0,
  );

  const [
    loading,
    setLoading,
  ] = useState(
    true,
  );

  const [
    saving,
    setSaving,
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
    success,
    setSuccess,
  ] = useState<
    string |
    null
  >(
    null,
  );

  const [
    aiImportOpen,
    setAiImportOpen,
  ] = useState(
    false,
  );

  const [
    aiImportDraft,
    setAiImportDraft,
  ] = useState<
    TimetableAiImportResult |
    null
  >(null);

  const [
    dayIds,
    setDayIds,
  ] = useState<
    TimetableV3DayId[]
  >(
    [],
  );

  const [
    periods,
    setPeriods,
  ] = useState<
    PeriodRow[]
  >(
    [],
  );

  const [
    classes,
    setClasses,
  ] = useState<
    string[]
  >(
    [],
  );

  const [
    classMappings,
    setClassMappings,
  ] = useState<TimetableV3ClassMappings>({});

  const [
    stages,
    setStages,
  ] = useState<TimetableV3StageId[]>([]);

  const [
    subjects,
    setSubjects,
  ] = useState<
    string[]
  >(
    [],
  );

  const [
    teachers,
    setTeachers,
  ] = useState<
    TeacherRow[]
  >(
    [],
  );

  const hydrate =
    useCallback(
      (
        data:
          TimetableV3SetupWorkspace,
      ) => {
        setWorkspace(
          data,
        );

        setDayIds(
          data.days.map(
            (day) =>
              day.id,
          ),
        );

        setPeriods(
          data.periods.map(
            (period) => ({
              label:
                period.label,

              startTime:
                period.startTime ??
                "",

              endTime:
                period.endTime ??
                "",

              isBreak:
                period.isBreak,
            }),
          ),
        );

        setClasses(
          data.classes.length
            ? data.classes.map(
                (item) =>
                  item.name,
              )
            : [],
        );

        setClassMappings(
          data.classMappings ?? {},
        );

        setStages(
          data.project.stages,
        );

        setSubjects(
          data.subjects.length
            ? data.subjects.map(
                (item) =>
                  item.name,
              )
            : [""],
        );

        setTeachers(
          data.teachers.length
            ? data.teachers.map(
                (item) => ({
                  name:
                    item.name,

                  specialty:
                    item.specialty,

                  maxWeeklyLoad:
                    item.maxWeeklyLoad,
                }),
              )
            : [
                {
                  name:
                    "",

                  specialty:
                    "",

                  maxWeeklyLoad:
                    24,
                },
              ],
        );
      },
      [],
    );

  useEffect(
    () => {
      void fetch(
        `/api/dashboard/principal/timetable-v3/projects/${projectId}/setup`,
      )
        .then(
          async (
            response,
          ) => {
            const data =
              await response.json();

            if (
              !response.ok ||
              !data?.success
            ) {
              throw new Error(
                data?.error ??
                "تعذر تحميل المشروع.",
              );
            }

            hydrate(
              data.workspace,
            );
          },
        )
        .catch(
          (
            cause,
          ) => {
            setError(
              cause instanceof Error
                ? cause.message
                : "تعذر تحميل المشروع.",
            );
          },
        )
        .finally(
          () =>
            setLoading(
              false,
            ),
        );
    },
    [
      hydrate,
      projectId,
    ],
  );

  async function save(
    body:
      Record<
        string,
        unknown
      >,
  ) {
    setSaving(
      true,
    );

    setError(
      null,
    );

    setSuccess(
      null,
    );

    try {
      const response =
        await fetch(
          `/api/dashboard/principal/timetable-v3/projects/${projectId}/setup`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                body,
              ),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.error ??
          "تعذر الحفظ.",
        );
      }

      hydrate(
        data.workspace,
      );

      return true;
    }
    catch (
      cause
    ) {
      setError(
        cause instanceof Error
          ? cause.message
          : "تعذر الحفظ.",
      );

      return false;
    }
    finally {
      setSaving(
        false,
      );
    }
  }

  async function saveClassMappings(
    mappings: TimetableV3ClassMappings,
  ) {
    const ok = await save({
      action: "SAVE_CLASS_MAPPINGS",
      classMappings: mappings,
    });

    if (ok) {
      setSuccess("تم حفظ ربط الفصول دون تغيير بياناتها الحالية.");
    }

    return ok;
  }

  function applyAiImport(
    result:
      TimetableAiImportResult,
  ) {
    setAiImportDraft(
      result,
    );

    if (
      result.stages.length >
      0
    ) {
      setStages(
        (
          current,
        ) =>
          uniqueStrings([
            ...current,
            ...result.stages,
          ]) as TimetableV3StageId[],
      );
    }

    if (
      result.classes.length >
      0
    ) {
      setClasses(
        (
          current,
        ) =>
          uniqueStrings([
            ...current,
            ...result.classes.map(
              (
                item,
              ) =>
                item.name,
            ),
          ]),
      );
    }

    if (
      result.subjects.length >
      0
    ) {
      setSubjects(
        (
          current,
        ) =>
          uniqueStrings([
            ...current,
            ...result.subjects.map(
              (
                item,
              ) =>
                item.name,
            ),
          ]),
      );
    }

    if (
      result.teachers.length >
      0
    ) {
      setTeachers(
        (
          current,
        ) => {
          const byName =
            new Map<
              string,
              TeacherRow
            >();

          for (
            const teacher of
            current
          ) {
            if (
              !teacher.name.trim()
            ) {
              continue;
            }

            byName.set(
              normalizeKey(
                teacher.name,
              ),
              teacher,
            );
          }

          for (
            const teacher of
            result.teachers
          ) {
            const key =
              normalizeKey(
                teacher.name,
              );

            if (
              byName.has(
                key,
              )
            ) {
              continue;
            }

            byName.set(
              key,
              {
                name:
                  teacher.name,

                specialty:
                  teacher.specialty ??
                  "",

                maxWeeklyLoad:
                  teacher.maxWeeklyLoad ??
                  24,
              },
            );
          }

          return [
            ...byName.values(),
          ];
        },
      );
    }

    setAiImportOpen(
      false,
    );

    setError(
      null,
    );

    console.info(
      "[TIMETABLE_V3_AI_IMPORT_APPLY]",
      `stages=${result.stages.length} classes=${result.classes.length} subjects=${result.subjects.length} teachers=${result.teachers.length} assignments=${result.assignments.length} constraints=${result.constraintCandidates.length}`,
    );

    setSuccess(
      "تم تطبيق البيانات المستخرجة على الإعداد. راجعها ثم احفظ الخطوات بالطريقة المعتادة.",
    );
    setSuccess(
      "\u062a\u0645 \u062a\u0637\u0628\u064a\u0642 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0627\u0633\u062a\u064a\u0631\u0627\u062f \u0639\u0644\u0649 \u0625\u0639\u062f\u0627\u062f \u0627\u0644\u0645\u0634\u0631\u0648\u0639. \u0631\u0627\u062c\u0639 \u0627\u0644\u062e\u0637\u0648\u0627\u062a \u062b\u0645 \u0627\u062d\u0641\u0638\u0647\u0627.\n\u062a\u0645 \u062a\u062c\u0647\u064a\u0632 \u0627\u0644\u0625\u0633\u0646\u0627\u062f\u0627\u062a \u0648\u0627\u0644\u0642\u064a\u0648\u062f \u0644\u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u0641\u064a \u062e\u0637\u0648\u0627\u062a\u0647\u0627 \u0627\u0644\u0645\u062e\u0635\u0635\u0629.",
    );
  }

  async function saveCurrentStep() {
    let ok =
      false;

    switch (
      step
    ) {
      case 0:
        ok =
          await save({
            action:
              "SAVE_DAYS",

            dayIds,
          });
        break;

      case 1:
        ok =
          await save({
            action:
              "SAVE_PERIODS",

            periods:
              periods
                .map(
                  (
                    period,
                  ) => ({
                    label:
                      period.label.trim(),

                    startTime:
                      period.startTime.trim() ||
                      null,

                    endTime:
                      period.endTime.trim() ||
                      null,

                    isBreak:
                      period.isBreak,
                  }),
                )
                .filter(
                  (
                    period,
                  ) =>
                    Boolean(
                      period.label,
                    ),
                ),
          });
        break;

      case 2:
        if (stages.length === 0) {
          setError(
            "اختر مرحلة دراسية واحدة على الأقل.",
          );
          return;
        }

        ok =
          await save({
            action:
              "SAVE_CLASSES",

            names:
              cleanStrings(
                classes,
              ),

            stages,
          });
        break;

      case 3:
        ok =
          await save({
            action:
              "SAVE_SUBJECTS",

            names:
              cleanStrings(
                subjects,
              ),
          });
        break;

      case 4:
        ok =
          await save({
            action:
              "SAVE_TEACHERS",

            teachers:
              teachers
                .map(
                  (
                    teacher,
                  ) => ({
                    name:
                      teacher.name.trim(),

                    specialty:
                      teacher.specialty.trim(),

                    maxWeeklyLoad:
                      Number(
                        teacher.maxWeeklyLoad,
                      ),
                  }),
                )
                .filter(
                  (
                    teacher,
                  ) =>
                    Boolean(
                      teacher.name,
                    ),
                ),
          });
        break;

      case 5:
        router.push(
          `/dashboard/timetable-v3/${projectId}/assignments`,
        );
        return;
    }

    if (
      ok &&
      step <
        STEPS.length -
          1
    ) {
      setStep(
        (
          value,
        ) =>
          value +
          1,
      );
    }
  }

  const progress =
    useMemo(
      () =>
        ((step + 1) /
          STEPS.length) *
        100,
      [
        step,
      ],
    );

  if (
    loading
  ) {
    return (
      <CenterMessage>
        جاري التحميل...
      </CenterMessage>
    );
  }

  if (
    !workspace
  ) {
    return (
      <CenterMessage>
        {error ??
          "تعذر تحميل المشروع."}
      </CenterMessage>
    );
  }

  return (
    <div
      dir="rtl"
      className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10"
    >
      <header className="mb-7 flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/timetable-v3"
            className="mb-3 inline-flex text-sm text-slate-500 transition hover:text-slate-900"
          >
            ← المشاريع
          </Link>

          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            {
              workspace
                .project
                .name
            }
          </h1>
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="hidden text-left text-sm text-slate-500 sm:block">
            {
              workspace
                .project
                .academicYear
            }
            <br />
            {
              workspace
                .project
                .semester
            }
          </div>

          <button
            type="button"
            onClick={
              () =>
                setAiImportOpen(
                  true,
                )
            }
            className="rounded-xl border border-[#3478B8]/20 bg-blue-50 px-4 py-2 text-sm font-semibold text-[#3478B8] transition hover:bg-blue-100"
          >
            ✦ استيراد ذكي
          </button>
        </div>
      </header>

      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between text-xs font-medium text-slate-500">
          <span>
            {
              STEPS[
                step
              ]
            }
          </span>

          <span>
            {step + 1}
            /
            {
              STEPS.length
            }
          </span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#3478B8] transition-all duration-300"
            style={{
              width:
                `${progress}%`,
            }}
          />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav className="hidden lg:block">
          <div className="space-y-1">
            {STEPS.map(
              (
                label,
                index,
              ) => (
                <button
                  key={
                    label
                  }
                  type="button"
                  onClick={
                    () =>
                      setStep(
                        index,
                      )
                  }
                  className={[
                    "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-sm transition",
                    index ===
                    step
                      ? "bg-[#3478B8] font-semibold text-white"
                      : index <
                          step
                        ? "text-slate-700 hover:bg-slate-100"
                        : "text-slate-400 hover:bg-slate-50",
                  ].join(
                    " ",
                  )}
                >
                  <span
                    className={[
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs",
                      index ===
                      step
                        ? "bg-white text-slate-950"
                        : "bg-slate-100 text-slate-600",
                    ].join(
                      " ",
                    )}
                  >
                    {
                      index <
                      step
                        ? "✓"
                        : index +
                          1
                    }
                  </span>

                  {
                    label
                  }
                </button>
              ),
            )}
          </div>
        </nav>

        <main className="min-w-0">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            {step ===
            0 ? (
              <DaysStep
                value={
                  dayIds
                }
                onChange={
                  setDayIds
                }
              />
            ) : null}

            {step ===
            1 ? (
              <PeriodsStep
                value={
                  periods
                }
                onChange={
                  setPeriods
                }
              />
            ) : null}

            {step ===
            2 ? (
              <ClassesStep
                value={
                  classes
                }
                onChange={
                  setClasses
                }
                stages={stages}
                onStagesChange={setStages}
                classItems={workspace.classes}
                classMappings={classMappings}
                onSaveClassMappings={saveClassMappings}
              />
            ) : null}

            {step ===
            3 ? (
              <SubjectsStep
                value={
                  subjects
                }
                onChange={
                  setSubjects
                }
              />
            ) : null}

            {step ===
            4 ? (
              <TeachersStep
                value={
                  teachers
                }
                onChange={
                  setTeachers
                }
              />
            ) : null}

            {step ===
            5 ? (
              <ReviewStep
                workspace={
                  workspace
                }
              />
            ) : null}
          </section>

          {error ? (
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {
                error
              }
            </div>
          ) : null}

          {success ? (
            <div className="mt-4 whitespace-pre-line rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {
                success
              }
            </div>
          ) : null}

          <div className="sticky bottom-3 mt-6 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
            <button
              type="button"
              disabled={
                step ===
                0
              }
              onClick={
                () =>
                  setStep(
                    (
                      value,
                    ) =>
                      Math.max(
                        0,
                        value -
                          1,
                      ),
                  )
              }
              className="h-11 rounded-xl px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-30"
            >
              السابق
            </button>

            <button
              type="button"
              disabled={
                saving ||
                (step === 2 && stages.length === 0)
              }
              onClick={
                () =>
                  void saveCurrentStep()
              }
              className="h-11 rounded-xl bg-[#3478B8] px-6 text-sm font-semibold text-white transition hover:bg-[#2D6BA5] disabled:opacity-50"
            >
              {saving
                ? "جاري الحفظ..."
                : step ===
                    STEPS.length -
                      1
                  ? "التالي: الإسنادات"
                  : "حفظ ومتابعة"}
            </button>
          </div>
        </main>
      </div>

      {aiImportOpen ? (
        <TimetableV3SmartImportPanel
          projectId={
            projectId
          }
          onClose={
            () =>
              setAiImportOpen(
                false,
              )
          }
          onApply={
            applyAiImport
          }
        />
      ) : null}
    </div>
  );
}

function DaysStep(
  props: {
    value:
      TimetableV3DayId[];

    onChange: (
      value:
        TimetableV3DayId[],
    ) => void;
  },
) {
  function toggle(
    dayId:
      TimetableV3DayId,
  ) {
    props.onChange(
      props.value.includes(
        dayId,
      )
        ? props.value.filter(
            (
              item,
            ) =>
              item !==
              dayId,
          )
        : [
            ...props.value,
            dayId,
          ],
    );
  }

  return (
    <>
      <StepTitle>
        أيام الدراسة
      </StepTitle>

      <div className="mt-6 grid gap-3 sm:grid-cols-5">
        {TIMETABLE_V3_DAY_OPTIONS.map(
          (
            day,
          ) => {
            const active =
              props.value.includes(
                day.id,
              );

            return (
              <button
                key={
                  day.id
                }
                type="button"
                onClick={
                  () =>
                    toggle(
                      day.id,
                    )
                }
                className={[
                  "h-20 rounded-2xl border text-sm font-semibold transition",
                  active
                    ? "border-[#3478B8] bg-[#3478B8] text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-400",
                ].join(
                  " ",
                )}
              >
                {
                  day.label
                }
              </button>
            );
          },
        )}
      </div>
    </>
  );
}

function PeriodsStep(
  props: {
    value:
      PeriodRow[];

    onChange: (
      value:
        PeriodRow[],
    ) => void;
  },
) {
  const lessonRows =
    props.value.filter(
      (period) =>
        !period.isBreak,
    );

  const [
    periodCount,
    setPeriodCount,
  ] = useState(
    lessonRows.length ||
    7,
  );

  const [
    firstStart,
    setFirstStart,
  ] = useState(
    lessonRows[0]
      ?.startTime ||
    "07:00",
  );

  const [
    duration,
    setDuration,
  ] = useState(
    () =>
      inferPeriodDuration(
        props.value,
      ) ||
      45,
  );

  const [
    transitionMinutes,
    setTransitionMinutes,
  ] = useState(
    () =>
      inferTransitionDuration(
        props.value,
      ),
  );

  const [
    editingIndex,
    setEditingIndex,
  ] = useState<
    number |
    null
  >(
    null,
  );

  const [
    breakDraft,
    setBreakDraft,
  ] = useState<{
    afterIndex: number;
    name: string;
    duration: number;
  } | null>(
    null,
  );

  function generate(
    count:
      number,
    start:
      string,
    lessonDuration:
      number,
    transition:
      number,
  ) {
    const startMinutes =
      timeToMinutes(
        start,
      );

    if (
      startMinutes ===
      null
    ) {
      return;
    }

    const safeCount =
      Math.max(
        1,
        Math.min(
          12,
          count,
        ),
      );

    const safeDuration =
      Math.max(
        1,
        Math.min(
          180,
          lessonDuration,
        ),
      );

    const safeTransition =
      Math.max(
        0,
        Math.min(
          60,
          transition,
        ),
      );

    const breaks =
      extractBreakSpecs(
        props.value,
      );

    const next:
      PeriodRow[] = [];

    let cursor =
      startMinutes;

    for (
      let lessonIndex = 0;
      lessonIndex <
      safeCount;
      lessonIndex++
    ) {
      const lessonEnd =
        cursor +
        safeDuration;

      next.push({
        label:
          `الحصة ${lessonIndex + 1}`,

        startTime:
          minutesToTime(
            cursor,
          ),

        endTime:
          minutesToTime(
            lessonEnd,
          ),

        isBreak:
          false,
      });

      cursor =
        lessonEnd;

      const lessonBreaks =
        breaks.filter(
          (item) =>
            item.afterLesson ===
            lessonIndex + 1,
        );

      for (
        const breakItem of
        lessonBreaks
      ) {
        const breakEnd =
          cursor +
          breakItem.duration;

        next.push({
          label:
            breakItem.label,

          startTime:
            minutesToTime(
              cursor,
            ),

          endTime:
            minutesToTime(
              breakEnd,
            ),

          isBreak:
            true,
        });

        cursor =
          breakEnd;
      }

      if (
        lessonIndex <
        safeCount - 1
      ) {
        cursor +=
          safeTransition;
      }
    }

    props.onChange(
      next,
    );
  }

  function changeCount(
    value:
      number,
  ) {
    const next =
      Math.max(
        1,
        Math.min(
          12,
          value,
        ),
      );

    setPeriodCount(
      next,
    );

    generate(
      next,
      firstStart,
      duration,
      transitionMinutes,
    );
  }

  function changeStart(
    value:
      string,
  ) {
    setFirstStart(
      value,
    );

    generate(
      periodCount,
      value,
      duration,
      transitionMinutes,
    );
  }

  function changeDuration(
    value:
      number,
  ) {
    const next =
      Math.max(
        1,
        value,
      );

    setDuration(
      next,
    );

    generate(
      periodCount,
      firstStart,
      next,
      transitionMinutes,
    );
  }

  function changeTransition(
    value:
      number,
  ) {
    const next =
      Math.max(
        0,
        value,
      );

    setTransitionMinutes(
      next,
    );

    generate(
      periodCount,
      firstStart,
      duration,
      next,
    );
  }

  function updatePeriod(
    index:
      number,
    patch:
      Partial<PeriodRow>,
  ) {
    props.onChange(
      props.value.map(
        (
          period,
          itemIndex,
        ) =>
          itemIndex ===
          index
            ? {
                ...period,
                ...patch,
              }
            : period,
      ),
    );
  }

  function openBreak(
    index:
      number,
  ) {
    setBreakDraft({
      afterIndex:
        index,

      name:
        "فسحة",

      duration:
        20,
    });
  }

  function addBreak() {
    if (
      !breakDraft
    ) {
      return;
    }

    const source =
      props.value[
        breakDraft.afterIndex
      ];

    if (
      !source ||
      source.isBreak
    ) {
      return;
    }

    const sourceEnd =
      timeToMinutes(
        source.endTime,
      );

    if (
      sourceEnd ===
      null
    ) {
      return;
    }

    const safeDuration =
      Math.max(
        1,
        Math.min(
          120,
          Number(
            breakDraft.duration,
          ),
        ),
      );

    const label =
      breakDraft.name
        .trim() ||
      "فسحة";

    const breakRow:
      PeriodRow = {
        label,

        startTime:
          minutesToTime(
            sourceEnd,
          ),

        endTime:
          minutesToTime(
            sourceEnd +
            safeDuration,
          ),

        isBreak:
          true,
      };

    const before =
      props.value.slice(
        0,
        breakDraft.afterIndex +
          1,
      );

    const after =
      props.value
        .slice(
          breakDraft.afterIndex +
            1,
        )
        .map(
          (period) =>
            shiftPeriod(
              period,
              safeDuration,
            ),
        );

    props.onChange([
      ...before,
      breakRow,
      ...after,
    ]);

    setBreakDraft(
      null,
    );
  }

  function removePeriod(
    index:
      number,
  ) {
    const item =
      props.value[
        index
      ];

    if (!item) {
      return;
    }

    if (
      item.isBreak
    ) {
      const start =
        timeToMinutes(
          item.startTime,
        );

      const end =
        timeToMinutes(
          item.endTime,
        );

      const breakDuration =
        start !==
          null &&
        end !==
          null
          ? Math.max(
              0,
              end -
                start,
            )
          : 0;

      const before =
        props.value.slice(
          0,
          index,
        );

      const after =
        props.value
          .slice(
            index + 1,
          )
          .map(
            (period) =>
              shiftPeriod(
                period,
                -breakDuration,
              ),
          );

      props.onChange([
        ...before,
        ...after,
      ]);

      setEditingIndex(
        null,
      );

      return;
    }

    const next =
      props.value.filter(
        (
          _,
          itemIndex,
        ) =>
          itemIndex !==
          index,
      );

    props.onChange(
      next,
    );

    setPeriodCount(
      next.filter(
        (period) =>
          !period.isBreak,
      ).length,
    );

    setEditingIndex(
      null,
    );
  }

  return (
    <>
      <StepTitle>
        الحصص اليومية
      </StepTitle>

      <div className="mt-6 rounded-3xl border border-[#D7ECF7] bg-[#F4FBFE] p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PeriodConfigField
            label="عدد الحصص اليومية"
          >
            <input
              type="number"
              min={1}
              max={12}
              value={
                periodCount
              }
              onChange={
                (event) =>
                  changeCount(
                    Number(
                      event.target.value,
                    ),
                  )
              }
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-[#3478B8] focus:ring-4 focus:ring-[#3478B8]/10"
            />
          </PeriodConfigField>

          <PeriodConfigField
            label="بداية أول حصة"
          >
            <input
              type="time"
              value={
                firstStart
              }
              onChange={
                (event) =>
                  changeStart(
                    event.target.value,
                  )
              }
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-[#3478B8] focus:ring-4 focus:ring-[#3478B8]/10"
            />
          </PeriodConfigField>

          <PeriodConfigField
            label="مدة الحصة (دقيقة)"
          >
            <input
              type="number"
              min={1}
              max={180}
              value={
                duration
              }
              onChange={
                (event) =>
                  changeDuration(
                    Number(
                      event.target.value,
                    ),
                  )
              }
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-[#3478B8] focus:ring-4 focus:ring-[#3478B8]/10"
            />
          </PeriodConfigField>

          <PeriodConfigField
            label="مدة الانتقال بين الحصص"
          >
            <input
              type="number"
              min={0}
              max={60}
              value={
                transitionMinutes
              }
              onChange={
                (event) =>
                  changeTransition(
                    Number(
                      event.target.value,
                    ),
                  )
              }
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-[#3478B8] focus:ring-4 focus:ring-[#3478B8]/10"
            />
          </PeriodConfigField>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {props.value.map(
          (
            period,
            index,
          ) => {
            const editing =
              editingIndex ===
              index;

            const nextRow =
              props.value[
                index + 1
              ];

            const canAddBreak =
              !period.isBreak &&
              !nextRow?.isBreak;

            return (
              <div
                key={
                  `${period.label}-${index}`
                }
              >
                <div
                  className={[
                    "rounded-2xl border bg-white p-4 transition",
                    period.isBreak
                      ? "border-[#F1D27A] bg-[#FFFDF5]"
                      : "border-slate-200 hover:border-[#B9D8EC]",
                  ].join(
                    " ",
                  )}
                >
                  {!editing ? (
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={[
                            "grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white",
                            period.isBreak
                              ? "bg-[#D8830B]"
                              : "bg-[#3478B8]",
                          ].join(
                            " ",
                          )}
                        >
                          {period.isBreak
                            ? "ف"
                            : lessonNumberAt(
                                props.value,
                                index,
                              )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 font-semibold text-slate-950">
                            {
                              period.label
                            }

                            {period.isBreak ? (
                              <span className="rounded-full bg-[#FFF3CD] px-2 py-0.5 text-[10px] font-bold text-[#946200]">
                                فسحة
                              </span>
                            ) : null}
                          </div>

                          <div
                            dir="ltr"
                            className="mt-1 text-sm font-semibold tabular-nums text-slate-500"
                          >
                            {
                              period.startTime ||
                              "--:--"
                            }
                            {" - "}
                            {
                              period.endTime ||
                              "--:--"
                            }
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={
                            () =>
                              setEditingIndex(
                                index,
                              )
                          }
                          className="h-9 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 transition hover:border-[#3478B8] hover:text-[#3478B8]"
                        >
                          تعديل
                        </button>

                        {canAddBreak ? (
                          <button
                            type="button"
                            onClick={
                              () =>
                                openBreak(
                                  index,
                                )
                            }
                            className="h-9 rounded-xl border border-[#E6B84F] bg-[#FFFDF6] px-4 text-xs font-semibold text-[#9A6500] transition hover:bg-[#FFF8E3]"
                          >
                            + فسحة بعدها
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_140px_auto] sm:items-end">
                      <PeriodConfigField
                        label={
                          period.isBreak
                            ? "اسم الفسحة"
                            : "اسم الحصة"
                        }
                      >
                        <input
                          value={
                            period.label
                          }
                          onChange={
                            (event) =>
                              updatePeriod(
                                index,
                                {
                                  label:
                                    event.target.value,
                                },
                              )
                          }
                          className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#3478B8]"
                        />
                      </PeriodConfigField>

                      <PeriodConfigField
                        label="البداية"
                      >
                        <input
                          type="time"
                          value={
                            period.startTime
                          }
                          onChange={
                            (event) =>
                              updatePeriod(
                                index,
                                {
                                  startTime:
                                    event.target.value,
                                },
                              )
                          }
                          className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#3478B8]"
                        />
                      </PeriodConfigField>

                      <PeriodConfigField
                        label="النهاية"
                      >
                        <input
                          type="time"
                          value={
                            period.endTime
                          }
                          onChange={
                            (event) =>
                              updatePeriod(
                                index,
                                {
                                  endTime:
                                    event.target.value,
                                },
                              )
                          }
                          className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#3478B8]"
                        />
                      </PeriodConfigField>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={
                            () =>
                              setEditingIndex(
                                null,
                              )
                          }
                          className="h-11 rounded-xl bg-[#3478B8] px-4 text-sm font-semibold text-white transition hover:bg-[#2D6BA5]"
                        >
                          تم
                        </button>

                        <button
                          type="button"
                          onClick={
                            () =>
                              removePeriod(
                                index,
                              )
                          }
                          className="h-11 rounded-xl px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {breakDraft?.afterIndex ===
                index ? (
                  <div className="mt-3 rounded-3xl border border-[#F0D16B] bg-[#FFFBEF] p-5">
                    <div className="mb-4 text-sm font-bold text-[#754600]">
                      إضافة فسحة بعد {
                        period.label
                      }
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <PeriodConfigField
                        label="اسم الفسحة"
                      >
                        <input
                          value={
                            breakDraft.name
                          }
                          onChange={
                            (event) =>
                              setBreakDraft({
                                ...breakDraft,

                                name:
                                  event.target.value,
                              })
                          }
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-[#D8830B]"
                        />
                      </PeriodConfigField>

                      <PeriodConfigField
                        label="مدة الفسحة (دقيقة)"
                      >
                        <input
                          type="number"
                          min={1}
                          max={120}
                          value={
                            breakDraft.duration
                          }
                          onChange={
                            (event) =>
                              setBreakDraft({
                                ...breakDraft,

                                duration:
                                  Number(
                                    event.target.value,
                                  ),
                              })
                          }
                          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-[#D8830B]"
                        />
                      </PeriodConfigField>
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={
                          () =>
                            setBreakDraft(
                              null,
                            )
                        }
                        className="h-10 rounded-xl border border-[#EACB70] bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-[#FFF8E3]"
                      >
                        إلغاء
                      </button>

                      <button
                        type="button"
                        onClick={
                          addBreak
                        }
                        className="h-10 rounded-xl bg-[#D8830B] px-5 text-sm font-semibold text-white transition hover:bg-[#C27508]"
                      >
                        إضافة الفسحة
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          },
        )}
      </div>
    </>
  );
}

type BreakSpec = {
  afterLesson: number;
  label: string;
  duration: number;
};

function extractBreakSpecs(
  periods:
    PeriodRow[],
): BreakSpec[] {
  const result:
    BreakSpec[] = [];

  let lessonNumber =
    0;

  for (
    const period of
    periods
  ) {
    if (
      !period.isBreak
    ) {
      lessonNumber +=
        1;

      continue;
    }

    if (
      lessonNumber <
      1
    ) {
      continue;
    }

    const start =
      timeToMinutes(
        period.startTime,
      );

    const end =
      timeToMinutes(
        period.endTime,
      );

    result.push({
      afterLesson:
        lessonNumber,

      label:
        period.label ||
        "فسحة",

      duration:
        start !==
          null &&
        end !==
          null
          ? Math.max(
              1,
              end -
                start,
            )
          : 20,
    });
  }

  return result;
}

function lessonNumberAt(
  periods:
    PeriodRow[],
  rowIndex:
    number,
) {
  return periods
    .slice(
      0,
      rowIndex +
        1,
    )
    .filter(
      (period) =>
        !period.isBreak,
    )
    .length;
}

function shiftPeriod(
  period:
    PeriodRow,
  minutes:
    number,
): PeriodRow {
  const start =
    timeToMinutes(
      period.startTime,
    );

  const end =
    timeToMinutes(
      period.endTime,
    );

  return {
    ...period,

    startTime:
      start ===
      null
        ? period.startTime
        : minutesToTime(
            start +
            minutes,
          ),

    endTime:
      end ===
      null
        ? period.endTime
        : minutesToTime(
            end +
            minutes,
          ),
  };
}

function PeriodConfigField(
  props: {
    label:
      string;

    children:
      ReactNode;
  },
) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-slate-600">
        {
          props.label
        }
      </span>

      {
        props.children
      }
    </label>
  );
}

function timeToMinutes(
  value:
    string,
) {
  const match =
    /^(\d{1,2}):(\d{2})$/.exec(
      value,
    );

  if (
    !match
  ) {
    return null;
  }

  const hours =
    Number(
      match[1],
    );

  const minutes =
    Number(
      match[2],
    );

  if (
    hours <
      0 ||
    hours >
      23 ||
    minutes <
      0 ||
    minutes >
      59
  ) {
    return null;
  }

  return (
    hours *
      60 +
    minutes
  );
}

function minutesToTime(
  value:
    number,
) {
  const normalized =
    ((value %
      1440) +
      1440) %
    1440;

  const hours =
    Math.floor(
      normalized /
        60,
    );

  const minutes =
    normalized %
    60;

  return `${String(
    hours,
  ).padStart(
    2,
    "0",
  )}:${String(
    minutes,
  ).padStart(
    2,
    "0",
  )}`;
}

function inferPeriodDuration(
  periods:
    PeriodRow[],
) {
  const first =
    periods.find(
      (period) =>
        !period.isBreak,
    );

  if (
    !first
  ) {
    return 0;
  }

  const start =
    timeToMinutes(
      first.startTime,
    );

  const end =
    timeToMinutes(
      first.endTime,
    );

  if (
    start ===
      null ||
    end ===
      null
  ) {
    return 0;
  }

  return Math.max(
    0,
    end -
      start,
  );
}

function inferTransitionDuration(
  periods:
    PeriodRow[],
) {
  for (
    let index = 0;
    index <
    periods.length -
      1;
    index++
  ) {
    const first =
      periods[
        index
      ];

    const second =
      periods[
        index + 1
      ];

    if (
      first.isBreak ||
      second.isBreak
    ) {
      continue;
    }

    const firstEnd =
      timeToMinutes(
        first.endTime,
      );

    const secondStart =
      timeToMinutes(
        second.startTime,
      );

    if (
      firstEnd !==
        null &&
      secondStart !==
        null
    ) {
      return Math.max(
        0,
        secondStart -
          firstEnd,
      );
    }
  }

  return 0;
}

function ClassesStep(
  props: {
    value:
      string[];

    onChange: (
      value:
        string[],
    ) => void;

    stages:
      TimetableV3StageId[];

    onStagesChange: (
      value:
        TimetableV3StageId[],
    ) => void;

    classItems: Array<{
      id: string;
      name: string;
    }>;

    classMappings: TimetableV3ClassMappings;

    onSaveClassMappings: (
      value: TimetableV3ClassMappings,
    ) => Promise<boolean>;
  },
) {
  const [
    counts,
    setCounts,
  ] = useState<
    GradeCountMap
  >(
    {},
  );

  const [
    manual,
    setManual,
  ] = useState<
    string[]
  >(
    () =>
      props.value.length
        ? [
            ...props.value,
          ]
        : [],
  );

  const [
    mappingDrafts,
    setMappingDrafts,
  ] = useState<TimetableV3ClassMappings>(
    props.classMappings,
  );

  const [
    mappingSavingId,
    setMappingSavingId,
  ] = useState<string | null>(null);

  const [
    mappingError,
    setMappingError,
  ] = useState<string | null>(null);

  const [
    countWarning,
    setCountWarning,
  ] = useState<string | null>(null);

  useEffect(() => {
    setMappingDrafts(props.classMappings);
  }, [props.classMappings]);

  const selectedStages =
    TIMETABLE_V3_STAGES.filter(
      (stage) =>
        props.stages.includes(
          stage.id,
        ),
    );

  const mappedCountByGrade = useMemo(() => {
    const counts: GradeCountMap = {};

    for (const classItem of props.classItems) {
      const classification = resolveTimetableV3ClassClassification(
        classItem.id,
        classItem.name,
        props.classMappings,
      );

      if (
        classification?.source === "mapping" &&
        props.value.includes(classItem.name)
      ) {
        counts[classification.gradeId] =
          (counts[classification.gradeId] ?? 0) + 1;
      }
    }

    return counts;
  }, [props.classItems, props.classMappings, props.value]);

  const unresolvedClasses = useMemo(
    () =>
      props.classItems.filter(
        (classItem) =>
          props.value.includes(classItem.name) &&
          !resolveTimetableV3ClassClassification(
            classItem.id,
            classItem.name,
            props.classMappings,
          ),
      ),
    [props.classItems, props.classMappings, props.value],
  );

  function updateMappingStage(
    classId: string,
    nextStageId: TimetableV3StageId | "",
  ) {
    setMappingError(null);

    if (!nextStageId) {
      setMappingDrafts((current) => {
        const next = { ...current };
        delete next[classId];
        return next;
      });
      return;
    }

    setMappingDrafts((current) => ({
      ...current,
      [classId]: {
        stageId: nextStageId,
        gradeId: "",
        gradeName: "",
      },
    }));
  }

  function updateMappingGrade(
    classId: string,
    gradeId: string,
  ) {
    const draft = mappingDrafts[classId];
    if (!draft) {
      return;
    }

    const stage = TIMETABLE_V3_STAGES.find(
      (item) => item.id === draft.stageId,
    );
    const grade = stage?.grades.find(
      (item) => item.id === gradeId,
    );

    if (!grade) {
      return;
    }

    setMappingError(null);
    setMappingDrafts((current) => ({
      ...current,
      [classId]: {
        stageId: draft.stageId,
        gradeId: grade.id,
        gradeName: grade.name,
      },
    }));
  }

  async function saveMapping(classId: string) {
    const draft = mappingDrafts[classId];
    if (!draft?.stageId || !draft.gradeId) {
      setMappingError("اختر المرحلة والصف قبل حفظ الربط.");
      return;
    }

    setMappingError(null);
    setMappingSavingId(classId);
    const ok = await props.onSaveClassMappings({
      ...props.classMappings,
      [classId]: draft,
    });
    setMappingSavingId(null);

    if (!ok) {
      setMappingError("تعذر حفظ ربط الفصل.");
    }
  }

  useEffect(() => {
    const nextCounts: GradeCountMap = {};
    const generatedNames = new Set<string>();
    const mappedNames = new Set<string>();
    const mappedCounts: GradeCountMap = {};

    for (const classItem of props.classItems) {
      const classification = resolveTimetableV3ClassClassification(
        classItem.id,
        classItem.name,
        props.classMappings,
      );

      if (
        classification?.source === "mapping" &&
        props.value.includes(classItem.name)
      ) {
        mappedNames.add(classItem.name);
        mappedCounts[classification.gradeId] =
          (mappedCounts[classification.gradeId] ?? 0) + 1;
      }
    }

    for (const stage of selectedStages) {
      for (const grade of stage.grades) {
        const generated = buildTimetableV3GradeClasses(
          grade.name,
          ARABIC_CLASS_SECTION_LETTERS.length,
        );
        const existing = generated.filter((name) =>
          props.value.includes(name) && !mappedNames.has(name),
        );

        nextCounts[grade.id] =
          existing.length + (mappedCounts[grade.id] ?? 0);
        existing.forEach((name) => generatedNames.add(name));
      }
    }

    setCounts(nextCounts);
    setManual(
      props.value.filter((name) => !generatedNames.has(name)),
    );
  }, [
    props.classItems,
    props.classMappings,
    props.stages,
    props.value,
  ]);

  function commit(
    nextCounts:
      GradeCountMap,
    nextManual:
      string[],
    stageIds:
      TimetableV3StageId[] = props.stages,
  ) {
    const stagesForCommit =
      TIMETABLE_V3_STAGES.filter((stage) =>
        stageIds.includes(stage.id),
      );

    const generated =
      stagesForCommit.flatMap(
        (
          stageItem,
        ) =>
          stageItem.grades.flatMap(
            (
              grade,
            ) =>
              buildTimetableV3GradeClasses(
                grade.name,
                Math.max(
                  0,
                  (nextCounts[grade.id] ?? 0) -
                    (mappedCountByGrade[grade.id] ?? 0),
                ),
              ),
          ),
      );

    props.onChange(
      uniqueStrings([
        ...generated,
        ...nextManual,
      ]),
    );
  }

  function toggleStage(
    stageId: TimetableV3StageId,
  ) {
    const removing = props.stages.includes(stageId);
    const stageToPreserve =
      TIMETABLE_V3_STAGES.find((stage) => stage.id === stageId);

    if (removing && stageToPreserve) {
      const mappedInStage = stageToPreserve.grades.reduce(
        (total, grade) => total + (mappedCountByGrade[grade.id] ?? 0),
        0,
      );

      if (mappedInStage > 0) {
        setCountWarning(
          `يوجد ${mappedInStage} فصول مرتبطة بهذه المرحلة. لا يمكن إلغاء المرحلة دون معالجة الفصول الحالية.`,
        );
        return;
      }
    }

    setCountWarning(null);
    const nextStages = removing
      ? props.stages.filter((item) => item !== stageId)
      : [...props.stages, stageId];
    const preservedGenerated = removing && stageToPreserve
      ? stageToPreserve.grades.flatMap((grade) =>
          buildTimetableV3GradeClasses(
            grade.name,
            Math.max(
              0,
              (counts[grade.id] ?? 0) -
                (mappedCountByGrade[grade.id] ?? 0),
            ),
          ),
        )
      : [];
    const nextManual = uniqueStrings([
      ...manual,
      ...preservedGenerated,
    ]);

    props.onStagesChange(nextStages);
    if (removing) {
      setManual(nextManual);
    }
    commit(counts, nextManual, nextStages);
  }

  function changeCount(
    gradeId: string,
    value: number,
  ) {
    const mappedCount = mappedCountByGrade[gradeId] ?? 0;

    if (value < mappedCount) {
      setCountWarning(
        `يوجد ${mappedCount} فصول مرتبطة بهذا الصف. لا يمكن تقليل العدد دون معالجة الفصول الحالية.`,
      );
      return;
    }

    setCountWarning(null);
    const next = {
      ...counts,

      [gradeId]:
        Math.max(
          0,
          Math.min(
            ARABIC_CLASS_SECTION_LETTERS.length,
            value,
          ),
        ),
    };

    setCounts(
      next,
    );

    commit(
      next,
      manual,
    );
  }

  function addManual() {
    const next = [
      ...manual,
      "",
    ];

    setManual(
      next,
    );

    commit(
      counts,
      next,
    );
  }

  function updateManual(
    index: number,
    value: string,
  ) {
    const next =
      manual.map(
        (
          item,
          itemIndex,
        ) =>
          itemIndex ===
          index
            ? value
            : item,
      );

    setManual(
      next,
    );

    commit(
      counts,
      next,
    );
  }

  function removeManual(
    index: number,
  ) {
    const next =
      manual.filter(
        (
          _,
          itemIndex,
        ) =>
          itemIndex !==
          index,
      );

    setManual(
      next,
    );

    commit(
      counts,
      next,
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StepTitle>
          الفصول
        </StepTitle>

        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {
            props.value.filter(
              Boolean,
            ).length
          }
          {" "}
          فصل
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {TIMETABLE_V3_STAGES.map(
          (
            item,
          ) => {
            const active =
              props.stages.includes(
                item.id,
              );

            return (
              <button
                key={
                  item.id
                }
                type="button"
                aria-pressed={active}
                onClick={
                  () =>
                    toggleStage(
                      item.id,
                    )
                }
                className={[
                  "rounded-2xl border px-5 py-4 text-right transition",
                  active
                    ? "border-[#3478B8] bg-[#3478B8] text-white"
                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-400",
                ].join(
                  " ",
                )}
              >
                <div className="font-semibold">
                  {
                    item.name
                  }
                </div>

                <div
                  className={[
                    "mt-1 text-xs",
                    active
                      ? "text-slate-300"
                      : "text-slate-400",
                  ].join(
                    " ",
                  )}
                >
                  {
                    item.grades.length
                  }
                  {" "}
                  صفوف
                </div>
              </button>
            );
          },
        )}
      </div>

      {props.stages.length === 0 ? (
        <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          اختر مرحلة دراسية واحدة على الأقل للمتابعة.
        </div>
      ) : null}

      {countWarning ? (
        <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {countWarning}
        </div>
      ) : null}

      {unresolvedClasses.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="mb-1 text-sm font-bold text-amber-900">
            فصول تحتاج ربط
          </div>
          <div className="mb-4 text-xs text-amber-800">
            اربط الفصول القديمة بالمرحلة والصف دون فقد الإسنادات.
          </div>

          <div className="space-y-2">
            {unresolvedClasses.map((classItem) => {
              const draft = mappingDrafts[classItem.id];
              const stage = TIMETABLE_V3_STAGES.find(
                (item) => item.id === draft?.stageId,
              );

              return (
                <div
                  key={classItem.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-100 bg-white px-3 py-2"
                >
                  <span className="min-w-16 font-bold text-slate-900">
                    {classItem.name}
                  </span>

                  <select
                    value={draft?.stageId ?? ""}
                    onChange={(event) =>
                      updateMappingStage(
                        classItem.id,
                        event.target.value as TimetableV3StageId | "",
                      )
                    }
                    className="h-9 min-w-40 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#3478B8]"
                  >
                    <option value="">المرحلة</option>
                    {TIMETABLE_V3_STAGES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={draft?.gradeId ?? ""}
                    disabled={!stage}
                    onChange={(event) =>
                      updateMappingGrade(
                        classItem.id,
                        event.target.value,
                      )
                    }
                    className="h-9 min-w-36 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#3478B8] disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">الصف</option>
                    {stage?.grades.map((grade) => (
                      <option key={grade.id} value={grade.id}>
                        {grade.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={
                      mappingSavingId === classItem.id ||
                      !draft?.stageId ||
                      !draft.gradeId
                    }
                    onClick={() => void saveMapping(classItem.id)}
                    className="h-9 rounded-lg bg-[#3478B8] px-3 text-xs font-bold text-white transition hover:bg-[#2D6BA5] disabled:opacity-40"
                  >
                    {mappingSavingId === classItem.id ? "جارٍ الحفظ..." : "حفظ الربط"}
                  </button>
                </div>
              );
            })}
          </div>

          {mappingError ? (
            <div className="mt-3 text-xs font-semibold text-red-700">
              {mappingError}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="mt-6 space-y-6">
        {selectedStages.map(
          (stage) => (
            <section key={stage.id}>
              <h3 className="mb-3 text-sm font-bold text-slate-900">
                {stage.name}
              </h3>

              <div className="space-y-2">
                {stage.grades.map((grade) => {
            const count =
              counts[
                grade.id
              ] ??
              0;
            const mappedCount =
              mappedCountByGrade[grade.id] ??
              0;
            const sectionLetters =
              ARABIC_CLASS_SECTION_LETTERS
                .slice(
                  0,
                  Math.min(
                    Math.max(count, 0),
                    ARABIC_CLASS_SECTION_LETTERS.length,
                  ),
                )
                .join("، ");

                  return (
              <div
                key={
                  grade.id
                }
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-4"
              >
                <div>
                  <div className="font-semibold text-slate-900">
                    {
                      grade.name
                    }
                  </div>
                  {mappedCount > 0 ? (
                    <div className="mt-1 text-xs font-semibold text-amber-700">
                      {mappedCount} فصول مرتبطة
                    </div>
                  ) : null}
                  {sectionLetters ? (
                    <div className="mt-1 text-xs font-semibold text-slate-400">
                      {sectionLetters}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={
                      () =>
                        changeCount(
                          grade.id,
                          count -
                            1,
                        )
                    }
                    disabled={
                      count <=
                      0
                    }
                    className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-lg text-slate-600 transition hover:bg-slate-50 disabled:opacity-25"
                  >
                    −
                  </button>

                  <div className="min-w-10 text-center text-sm font-bold text-slate-900">
                    {
                      count
                    }
                  </div>

                  <button
                    type="button"
                    onClick={
                      () =>
                        changeCount(
                          grade.id,
                          count +
                            1,
                        )
                    }
                    className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-lg text-slate-600 transition hover:bg-slate-50"
                  >
                    +
                  </button>
                </div>
              </div>
                  );
                })}
              </div>
            </section>
          ),
        )}
      </div>

      <div className="mt-8 border-t border-slate-100 pt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900">
            فصول مضافة يدويًا
          </div>

          <button
            type="button"
            onClick={
              addManual
            }
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            إضافة فصل
          </button>
        </div>

        {manual.length ===
        0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
            لا توجد فصول يدوية
          </div>
        ) : (
          <div className="space-y-2">
            {manual.map(
              (
                value,
                index,
              ) => (
                <div
                  key={
                    index
                  }
                  className="flex gap-2"
                >
                  <input
                    value={
                      value
                    }
                    onChange={
                      (
                        event,
                      ) =>
                        updateManual(
                          index,
                          event.target.value,
                        )
                    }
                    placeholder="اسم الفصل"
                    className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#3478B8]"
                  />

                  <button
                    type="button"
                    onClick={
                      () =>
                        removeManual(
                          index,
                        )
                    }
                    className="h-11 w-11 rounded-xl text-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    ×
                  </button>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </>
  );
}

function SubjectsStep(
  props: {
    value:
      string[];

    onChange: (
      value:
        string[],
    ) => void;
  },
) {
  const [
    bankOpen,
    setBankOpen,
  ] = useState(
    false,
  );

  function update(
    index: number,
    value: string,
  ) {
    props.onChange(
      props.value.map(
        (
          item,
          itemIndex,
        ) =>
          itemIndex ===
          index
            ? value
            : item,
      ),
    );
  }

  function addFromBank(
    names:
      string[],
  ) {
    props.onChange(
      uniqueStrings([
        ...props.value,
        ...names,
      ]),
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StepTitle>
          المواد
        </StepTitle>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={
              () =>
                setBankOpen(
                  true,
                )
            }
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            بنك المواد
          </button>

          <button
            type="button"
            onClick={
              () =>
                props.onChange([
                  ...props.value,
                  "",
                ])
            }
            className="rounded-xl bg-[#3478B8] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2D6BA5]"
          >
            إضافة مادة
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {props.value.map(
          (
            item,
            index,
          ) => (
            <div
              key={
                index
              }
              className="flex gap-2"
            >
              <input
                value={
                  item
                }
                placeholder="اسم المادة"
                onChange={
                  (
                    event,
                  ) =>
                    update(
                      index,
                      event.target.value,
                    )
                }
                className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#3478B8]"
              />

              <button
                type="button"
                disabled={
                  props.value.length <=
                  1
                }
                onClick={
                  () =>
                    props.onChange(
                      props.value.filter(
                        (
                          _,
                          itemIndex,
                        ) =>
                          itemIndex !==
                          index,
                      ),
                    )
                }
                className="h-11 w-11 rounded-xl text-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-20"
              >
                ×
              </button>
            </div>
          ),
        )}
      </div>

      {bankOpen ? (
        <SubjectBankDialog
          existing={
            props.value
          }
          onClose={
            () =>
              setBankOpen(
                false,
              )
          }
          onAdd={
            addFromBank
          }
        />
      ) : null}
    </>
  );
}

function SubjectBankDialog(
  props: {
    existing:
      string[];

    onClose:
      () => void;

    onAdd: (
      names:
        string[],
    ) => void;
  },
) {
  const [
    items,
    setItems,
  ] = useState<
    SubjectBankItem[]
  >(
    [],
  );

  const [
    loading,
    setLoading,
  ] = useState(
    true,
  );

  const [
    query,
    setQuery,
  ] = useState(
    "",
  );

  const [
    stage,
    setStage,
  ] = useState<
    "ALL" |
    TimetableV3StageId
  >(
    "ALL",
  );

  const [
    selected,
    setSelected,
  ] = useState<
    Set<string>
  >(
    new Set(),
  );

  useEffect(
    () => {
      void fetch(
        "/api/dashboard/principal/timetable-v2/subject-bank",
      )
        .then(
          async (
            response,
          ) => {
            const data =
              await response.json();

            if (
              !response.ok ||
              !data?.success
            ) {
              throw new Error();
            }

            const normalized =
              Array.isArray(
                data.subjects,
              )
                ? data.subjects
                    .map(
                      normalizeSubjectBankItem,
                    )
                    .filter(
                      (
                        item:
                          SubjectBankItem | null,
                      ): item is SubjectBankItem =>
                        Boolean(
                          item,
                        ),
                    )
                : [];

            setItems(
              normalized,
            );
          },
        )
        .finally(
          () =>
            setLoading(
              false,
            ),
        );
    },
    [],
  );

  const filtered =
    items.filter(
      (
        item,
      ) => {
        const matchesQuery =
          !query.trim() ||
          item.name
            .toLocaleLowerCase(
              "ar",
            )
            .includes(
              query
                .trim()
                .toLocaleLowerCase(
                  "ar",
                ),
            );

        const matchesStage =
          stage ===
            "ALL" ||
          item.stageIds.length ===
            0 ||
          item.stageIds.includes(
            stage,
          );

        return (
          matchesQuery &&
          matchesStage
        );
      },
    );

  function toggle(
    item:
      SubjectBankItem,
  ) {
    const next =
      new Set(
        selected,
      );

    if (
      next.has(
        item.id,
      )
    ) {
      next.delete(
        item.id,
      );
    }
    else {
      next.add(
        item.id,
      );
    }

    setSelected(
      next,
    );
  }

  function addSelected() {
    const names =
      items
        .filter(
          (
            item,
          ) =>
            selected.has(
              item.id,
            ),
        )
        .map(
          (
            item,
          ) =>
            item.name,
        );

    props.onAdd(
      names,
    );

    props.onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3478B8]/40 p-4 backdrop-blur-sm">
      <div
        dir="rtl"
        className="flex max-h-[82vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xl font-bold text-slate-950">
              بنك المواد
            </h3>

            <button
              type="button"
              onClick={
                props.onClose
              }
              className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-xl text-slate-500 transition hover:bg-slate-200"
            >
              ×
            </button>
          </div>

          <input
            autoFocus
            value={
              query
            }
            onChange={
              (
                event,
              ) =>
                setQuery(
                  event.target.value,
                )
            }
            placeholder="ابحث عن مادة..."
            className="mt-5 h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#3478B8]"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <BankFilter
              active={
                stage ===
                "ALL"
              }
              onClick={
                () =>
                  setStage(
                    "ALL",
                  )
              }
            >
              الكل
            </BankFilter>

            {TIMETABLE_V3_STAGES.map(
              (
                item,
              ) => (
                <BankFilter
                  key={
                    item.id
                  }
                  active={
                    stage ===
                    item.id
                  }
                  onClick={
                    () =>
                      setStage(
                        item.id,
                      )
                  }
                >
                  {
                    item.shortName
                  }
                </BankFilter>
              ),
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">
              جاري تحميل المواد...
            </div>
          ) : filtered.length ===
            0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              لا توجد مواد مطابقة
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(
                (
                  item,
                ) => {
                  const active =
                    selected.has(
                      item.id,
                    );

                  const exists =
                    props.existing.some(
                      (
                        name,
                      ) =>
                        normalizeKey(
                          name,
                        ) ===
                        normalizeKey(
                          item.name,
                        ),
                    );

                  return (
                    <button
                      key={
                        item.id
                      }
                      type="button"
                      disabled={
                        exists
                      }
                      onClick={
                        () =>
                          toggle(
                            item,
                          )
                      }
                      className={[
                        "flex min-h-16 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-right transition",
                        exists
                          ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
                          : active
                            ? "border-[#3478B8] bg-[#3478B8] text-white"
                            : "border-slate-200 bg-white text-slate-800 hover:border-slate-400",
                      ].join(
                        " ",
                      )}
                    >
                      <span className="font-semibold">
                        {
                          item.name
                        }
                      </span>

                      <span
                        className={[
                          "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs",
                          active
                            ? "border-white bg-white text-slate-950"
                            : "border-slate-300",
                        ].join(
                          " ",
                        )}
                      >
                        {active
                          ? "✓"
                          : exists
                            ? "✓"
                            : ""}
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-100 p-4 sm:px-6">
          <div className="text-sm font-medium text-slate-500">
            تم تحديد
            {" "}
            {
              selected.size
            }
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={
                props.onClose
              }
              className="h-11 rounded-xl px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              إلغاء
            </button>

            <button
              type="button"
              disabled={
                selected.size ===
                0
              }
              onClick={
                addSelected
              }
              className="h-11 rounded-xl bg-[#3478B8] px-5 text-sm font-semibold text-white transition hover:bg-[#2D6BA5] disabled:opacity-30"
            >
              إضافة المواد
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BankFilter(
  props: {
    active:
      boolean;

    onClick:
      () => void;

    children:
      ReactNode;
  },
) {
  return (
    <button
      type="button"
      onClick={
        props.onClick
      }
      className={[
        "rounded-full px-4 py-2 text-xs font-semibold transition",
        props.active
          ? "bg-[#3478B8] text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200",
      ].join(
        " ",
      )}
    >
      {
        props.children
      }
    </button>
  );
}

function TeachersStep(
  props: {
    value:
      TeacherRow[];

    onChange: (
      value:
        TeacherRow[],
    ) => void;
  },
) {
  function update(
    index: number,
    patch:
      Partial<TeacherRow>,
  ) {
    props.onChange(
      props.value.map(
        (
          teacher,
          itemIndex,
        ) =>
          itemIndex ===
          index
            ? {
                ...teacher,
                ...patch,
              }
            : teacher,
      ),
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <StepTitle>
          المعلمون
        </StepTitle>

        <button
          type="button"
          onClick={
            () =>
              props.onChange([
                ...props.value,
                {
                  name:
                    "",

                  specialty:
                    "",

                  maxWeeklyLoad:
                    24,
                },
              ])
          }
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          إضافة معلم
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {props.value.map(
          (
            teacher,
            index,
          ) => (
            <div
              key={
                index
              }
              className="grid gap-3 rounded-2xl border border-slate-200 p-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_120px_42px]"
            >
              <input
                value={
                  teacher.name
                }
                placeholder="اسم المعلم"
                onChange={
                  (
                    event,
                  ) =>
                    update(
                      index,
                      {
                        name:
                          event.target.value,
                      },
                    )
                }
                className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#3478B8]"
              />

              <input
                value={
                  teacher.specialty
                }
                placeholder="التخصص"
                onChange={
                  (
                    event,
                  ) =>
                    update(
                      index,
                      {
                        specialty:
                          event.target.value,
                      },
                    )
                }
                className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#3478B8]"
              />

              <input
                type="number"
                min={
                  1
                }
                max={
                  60
                }
                value={
                  teacher.maxWeeklyLoad
                }
                onChange={
                  (
                    event,
                  ) =>
                    update(
                      index,
                      {
                        maxWeeklyLoad:
                          Number(
                            event.target.value,
                          ),
                      },
                    )
                }
                className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#3478B8]"
              />

              <button
                type="button"
                disabled={
                  props.value.length <=
                  1
                }
                onClick={
                  () =>
                    props.onChange(
                      props.value.filter(
                        (
                          _,
                          itemIndex,
                        ) =>
                          itemIndex !==
                          index,
                      ),
                    )
                }
                className="h-11 rounded-xl text-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-20"
              >
                ×
              </button>
            </div>
          ),
        )}
      </div>
    </>
  );
}

function ReviewStep(
  props: {
    workspace:
      TimetableV3SetupWorkspace;
  },
) {
  const items = [
    {
      label:
        "أيام الدراسة",

      value:
        props.workspace.days.length,
    },
    {
      label:
        "الحصص اليومية",

      value:
        props.workspace.periods.length,
    },
    {
      label:
        "الفصول",

      value:
        props.workspace.classes.length,
    },
    {
      label:
        "المواد",

      value:
        props.workspace.subjects.length,
    },
    {
      label:
        "المعلمون",

      value:
        props.workspace.teachers.length,
    },
  ];

  return (
    <>
      <StepTitle>
        مراجعة الإعداد
      </StepTitle>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {items.map(
          (
            item,
          ) => (
            <div
              key={
                item.label
              }
              className="rounded-2xl bg-slate-50 p-5"
            >
              <div className="text-3xl font-bold text-slate-950">
                {
                  item.value
                }
              </div>

              <div className="mt-1 text-sm text-slate-500">
                {
                  item.label
                }
              </div>
            </div>
          ),
        )}
      </div>
    </>
  );
}

function StepTitle(
  props: {
    children:
      ReactNode;
  },
) {
  return (
    <h2 className="text-xl font-bold text-slate-950">
      {
        props.children
      }
    </h2>
  );
}

function CenterMessage(
  props: {
    children:
      ReactNode;
  },
) {
  return (
    <div
      dir="rtl"
      className="grid min-h-[65vh] place-items-center px-4 text-sm text-slate-500"
    >
      {
        props.children
      }
    </div>
  );
}

function cleanStrings(
  values:
    string[],
) {
  return uniqueStrings(
    values,
  );
}

function uniqueStrings(
  values:
    string[],
) {
  const seen =
    new Set<string>();

  const result:
    string[] = [];

  for (
    const value of
    values
  ) {
    const cleaned =
      value
        .trim()
        .replace(
          /\s+/g,
          " ",
        );

    if (
      !cleaned
    ) {
      continue;
    }

    const key =
      normalizeKey(
        cleaned,
      );

    if (
      seen.has(
        key,
      )
    ) {
      continue;
    }

    seen.add(
      key,
    );

    result.push(
      cleaned,
    );
  }

  return result;
}

function normalizeKey(
  value: string,
) {
  return value
    .trim()
    .replace(
      /\s+/g,
      " ",
    )
    .toLocaleLowerCase(
      "ar",
    );
}

function normalizeSubjectBankItem(
  raw:
    unknown,
): SubjectBankItem | null {
  if (
    !raw ||
    typeof raw !==
      "object" ||
    Array.isArray(
      raw,
    )
  ) {
    return null;
  }

  const item =
    raw as Record<
      string,
      unknown
    >;

  const candidateNames = [
    item.name,
    item.subjectName,
    item.canonicalName,
    item.label,
  ];

  const name =
    candidateNames.find(
      (
        value,
      ) =>
        typeof value ===
          "string" &&
        value.trim()
          .length >
          0,
    );

  if (
    typeof name !==
    "string"
  ) {
    return null;
  }

  const id =
    typeof item.id ===
      "string"
      ? item.id
      : name;

  const stageIds:
    string[] = [];

  if (
    typeof item.stageId ===
    "string"
  ) {
    stageIds.push(
      item.stageId,
    );
  }

  if (
    Array.isArray(
      item.stageIds,
    )
  ) {
    for (
      const value of
      item.stageIds
    ) {
      if (
        typeof value ===
        "string"
      ) {
        stageIds.push(
          value,
        );
      }
    }
  }

  return {
    id,
    name:
      name.trim(),
    stageIds:
      [...new Set(
        stageIds,
      )],
  };
}
