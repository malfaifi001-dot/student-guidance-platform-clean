import "server-only";

import {
  Prisma,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import {
  getTimetableV2CurriculumPlanBySourceId,
  getTimetableV2CanonicalSubjectName,
  getTimetableV2Grade,
  type TimetableV2SemesterId,
  type TimetableV2StageId,
  type TimetableV2StudyDayId,
  type TimetableStageWeeklyPeriodTargets,
} from "@/lib/timetable-v2";

import {
  buildTimetableV2TemplateItems,
  normalizeTimetableV2PlanText,
  validateTimetableV2CustomCurriculumItems,
  type CustomCurriculumItemInput,
} from "@/lib/timetable-v2/custom-curriculum-types";

export type TimetableV2CreateClassInput = {
  gradeId: string;
  sectionIndex: number;
  sectionName: string;
  planSourceId: string;
  customPlan?: TimetableV2CustomPlanInput | null;
};

export type TimetableV2CustomPlanInput = {
  name?: string;
  templateId?: string | null;
  stageId?: TimetableV2StageId | null;
  gradeId?: string | null;
  semesterId?: TimetableV2SemesterId | null;
  saveForFuture?: boolean;
  items: CustomCurriculumItemInput[];
};

export type CreateTimetableV2ProjectInput = {
  name: string;
  academicYear: string;
  semester: TimetableV2SemesterId;

  stageIds: TimetableV2StageId[];

  teacherCount: number;

  weeklyPeriodTarget?: number | null;

  stageWeeklyPeriodTargets?: TimetableStageWeeklyPeriodTargets;

  studyDays: TimetableV2StudyDayId[];

  periodsPerDay: number;

  classes: TimetableV2CreateClassInput[];
};

const DAY_LABELS: Record<
  TimetableV2StudyDayId,
  string
> = {
  SUNDAY: "الأحد",
  MONDAY: "الاثنين",
  TUESDAY: "الثلاثاء",
  WEDNESDAY: "الأربعاء",
  THURSDAY: "الخميس",
};

function normalizeText(
  value: string,
) {
  return value
    .trim()
    .replace(/\s+/g, " ");
}

function semesterLabel(
  semester: TimetableV2SemesterId,
) {
  return semester === "FIRST"
    ? "الفصل الدراسي الأول"
    : "الفصل الدراسي الثاني";
}

function validateInput(
  input: CreateTimetableV2ProjectInput,
) {
  if (!normalizeText(input.name)) {
    throw new Error("PROJECT_NAME_REQUIRED");
  }

  if (!normalizeText(input.academicYear)) {
    throw new Error("ACADEMIC_YEAR_REQUIRED");
  }

  if (
    input.stageIds.length === 0
  ) {
    throw new Error("STAGES_REQUIRED");
  }

  if (
    !Number.isInteger(
      input.teacherCount,
    ) ||
    input.teacherCount < 1 ||
    input.teacherCount > 500
  ) {
    throw new Error(
      "INVALID_TEACHER_COUNT",
    );
  }

  if (
    !Number.isInteger(
      input.periodsPerDay,
    ) ||
    input.periodsPerDay < 1 ||
    input.periodsPerDay > 12
  ) {
    throw new Error(
      "INVALID_PERIOD_COUNT",
    );
  }

  const stageTargets =
    input.stageWeeklyPeriodTargets ?? {};
  for (const [stageId, target] of Object.entries(stageTargets)) {
    if (!input.stageIds.includes(stageId as TimetableV2StageId)) {
      throw new Error("STAGE_TARGET_STAGE_MISMATCH");
    }

    if (
      !Number.isInteger(target) ||
      target < 1 ||
      target > 100
    ) {
      throw new Error("INVALID_STAGE_WEEKLY_TARGET");
    }
  }

  if (
    input.studyDays.length === 0
  ) {
    throw new Error(
      "STUDY_DAYS_REQUIRED",
    );
  }

  if (
    input.classes.length === 0
  ) {
    throw new Error(
      "CLASSES_REQUIRED",
    );
  }

  const classNames = new Set<string>();

  for (
    const classInput of
    input.classes
  ) {
    const grade =
      getTimetableV2Grade(
        classInput.gradeId,
      );

    if (!grade) {
      throw new Error(
        "INVALID_GRADE",
      );
    }

    if (
      !input.stageIds.includes(
        grade.stageId,
      )
    ) {
      throw new Error(
        "GRADE_STAGE_MISMATCH",
      );
    }

    const sectionName =
      normalizeText(
        classInput.sectionName,
      );

    if (!sectionName) {
      throw new Error(
        "SECTION_NAME_REQUIRED",
      );
    }

    const className =
      `${grade.name} ${sectionName}`;

    if (
      classNames.has(className)
    ) {
      throw new Error(
        "DUPLICATE_CLASS_NAME",
      );
    }

    classNames.add(className);

    if (
      classInput.customPlan
    ) {
      validateCustomPlanInput(
        classInput.customPlan,
        grade.id,
        grade.stageId,
        input.semester,
      );

      continue;
    }

    const plan =
      getTimetableV2CurriculumPlanBySourceId(
        classInput.planSourceId,
      );

    if (!plan) {
      throw new Error(
        "CURRICULUM_PLAN_NOT_FOUND",
      );
    }

    if (
      plan.gradeId !==
      classInput.gradeId
    ) {
      throw new Error(
        "CURRICULUM_GRADE_MISMATCH",
      );
    }

    if (
      grade.stageId === "HIGH" &&
      plan.semesterId &&
      plan.semesterId !==
        input.semester
    ) {
      throw new Error(
        "CURRICULUM_SEMESTER_MISMATCH",
      );
    }
  }
}

function validateCustomPlanInput(
  customPlan: TimetableV2CustomPlanInput,
  gradeId: string,
  stageId: TimetableV2StageId,
  semester: TimetableV2SemesterId,
) {
  if (
    customPlan.items.length === 0
  ) {
    throw new Error(
      "CUSTOM_PLAN_EMPTY",
    );
  }

  const validation =
    validateTimetableV2CustomCurriculumItems(
      customPlan.items,
    );

  if (
    !validation.valid
  ) {
    throw new Error(
      `CUSTOM_PLAN_INVALID:${validation.errors[0] ?? "بيانات الخطة غير صالحة."}`,
    );
  }

  if (
    customPlan.gradeId &&
    customPlan.gradeId !==
      gradeId
  ) {
    throw new Error(
      "CUSTOM_PLAN_GRADE_MISMATCH",
    );
  }

  if (
    stageId === "HIGH" &&
    customPlan.semesterId &&
    customPlan.semesterId !==
      semester
  ) {
    throw new Error(
      "CUSTOM_PLAN_SEMESTER_MISMATCH",
    );
  }
}

type ResolvedClassCurriculum = {
  planName: string;
  planType: "SYSTEM" | "CUSTOM";
  templateId: string | null;
  subjects: Array<{
    sourceName: string;
    canonicalName: string;
    weeklyPeriods: number;
  }>;
};

function resolveSystemClassCurriculum(
  classInput: TimetableV2CreateClassInput,
  grade: {
    id: string;
    stageId: TimetableV2StageId;
  },
  semester: TimetableV2SemesterId,
): ResolvedClassCurriculum {
  const plan =
    getTimetableV2CurriculumPlanBySourceId(
      classInput.planSourceId,
    );

  if (!plan) {
    throw new Error(
      "CURRICULUM_PLAN_NOT_FOUND",
    );
  }

  if (
    plan.gradeId !==
    grade.id
  ) {
    throw new Error(
      "CURRICULUM_GRADE_MISMATCH",
    );
  }

  if (
    grade.stageId === "HIGH" &&
    plan.semesterId &&
    plan.semesterId !==
      semester
  ) {
    throw new Error(
      "CURRICULUM_SEMESTER_MISMATCH",
    );
  }

  return {
    planName: plan.sourceName,
    planType: "SYSTEM",
    templateId: null,
    subjects: plan.subjects.map(
      (subject) => ({
        sourceName:
          subject.sourceName,
        canonicalName:
          subject.canonicalName,
        weeklyPeriods:
          subject.weeklyPeriods,
      }),
    ),
  };
}

async function resolveCustomClassCurriculum(
  tx: Prisma.TransactionClient,
  schoolAccountId: string,
  grade: {
    id: string;
    name: string;
    stageId: TimetableV2StageId;
  },
  classInput: TimetableV2CreateClassInput,
): Promise<ResolvedClassCurriculum> {
  const customPlan =
    classInput.customPlan!;

  let templateId =
    customPlan.templateId ??
    null;

  let planName =
    normalizeTimetableV2PlanText(
      customPlan.name ?? "",
    );

  if (
    customPlan.saveForFuture
  ) {
    if (!planName) {
      throw new Error(
        "CUSTOM_PLAN_NAME_REQUIRED",
      );
    }

    if (templateId) {
      const owned =
        await tx.timetableCurriculumTemplate.findFirst(
          {
            where: {
              id: templateId,
              schoolAccountId,
            },
            select: {
              id: true,
            },
          },
        );

      if (!owned) {
        throw new Error(
          "CUSTOM_PLAN_NOT_FOUND",
        );
      }

      await tx.timetableCurriculumTemplate.update(
        {
          where: {
            id: templateId,
          },

          data: {
            name: planName,

            stageId:
              customPlan.stageId ??
              null,

            gradeId:
              grade.id,

            semesterId:
              customPlan.semesterId ??
              null,

            items: {
              deleteMany: {},

              create:
                buildTimetableV2TemplateItems(
                  customPlan.items,
                ),
            },
          },
        },
      );
    } else {
      const template =
        await tx.timetableCurriculumTemplate.create(
          {
            data: {
              schoolAccountId,

              name: planName,

              stageId:
                customPlan.stageId ??
                null,

              gradeId:
                grade.id,

              semesterId:
                customPlan.semesterId ??
                null,

              items: {
                create:
                  buildTimetableV2TemplateItems(
                    customPlan.items,
                  ),
              },
            },

            select: {
              id: true,
            },
          },
        );

      templateId = template.id;
    }
  } else if (templateId) {
    const owned =
      await tx.timetableCurriculumTemplate.findFirst(
        {
          where: {
            id: templateId,
            schoolAccountId,
          },

          include: {
            items: {
              orderBy: {
                sortOrder: "asc",
              },
            },
          },
        },
      );

    if (!owned) {
      throw new Error(
        "CUSTOM_PLAN_NOT_FOUND",
      );
    }

    if (
      owned.gradeId &&
      owned.gradeId !==
        grade.id
    ) {
      throw new Error(
        "CUSTOM_PLAN_GRADE_MISMATCH",
      );
    }

    planName =
      planName ||
      owned.name;
  }

  if (!planName) {
    planName = "خطة مخصصة";
  }

  return {
    planName,
    planType: "CUSTOM",
    templateId,
    subjects:
      customPlan.items.map(
        (item) => {
          const subjectName =
            normalizeTimetableV2PlanText(
              item.subjectName ?? "",
            );

          return {
            sourceName:
              subjectName,

            canonicalName:
              getTimetableV2CanonicalSubjectName(
                subjectName,
              ),

            weeklyPeriods:
              item.weeklyLessons,
          };
        },
      ),
  };
}

export async function createTimetableV2Project(
  schoolAccountId: string,
  createdById: string,
  input: CreateTimetableV2ProjectInput,
) {
  validateInput(input);

  const days =
    input.studyDays.map(
      (dayId, index) => ({
        id: dayId,
        label:
          DAY_LABELS[dayId],
        order: index + 1,
      }),
    );

  const periods =
    Array.from(
      {
        length:
          input.periodsPerDay,
      },
      (_, index) => ({
        id: `PERIOD_${index + 1}`,
        label: `الحصة ${index + 1}`,
        order: index + 1,
        isBreak: false,
      }),
    );

  return prisma.$transaction(
    async (tx) => {
      const project =
        await tx.timetableProject.create(
          {
            data: {
              schoolAccountId,
              createdById,

              name: normalizeText(
                input.name,
              ),

              academicYear:
                normalizeText(
                  input.academicYear,
                ),

              semester:
                semesterLabel(
                  input.semester,
                ),

              daysJson:
                days as Prisma.InputJsonValue,

              periodsJson:
                periods as Prisma.InputJsonValue,

              settingsJson: {
                timetableV2: {
                  version: 2,

                  semesterId:
                    input.semester,

                  stageIds:
                    input.stageIds,

                  teacherTarget:
                    input.teacherCount,

                  weeklyPeriodTarget:
                    input.weeklyPeriodTarget ??
                    null,

                  stageWeeklyPeriodTargets:
                    input.stageWeeklyPeriodTargets ??
                    {},

                  studyDays:
                    input.studyDays,

                  periodsPerDay:
                    input.periodsPerDay,
                },
              } as Prisma.InputJsonValue,
            },
          },
        );

      const subjectByName =
        new Map<
          string,
          {
            id: string;
            name: string;
          }
        >();

      const classPlanMetadata: Array<{
        classId: string;
        className: string;
        stageId: TimetableV2StageId;
        gradeId: string;
        sectionIndex: number;
        sectionName: string;
        planSourceId: string;
        planName: string;
        planType?: "SYSTEM" | "CUSTOM";
        planTemplateId?: string;
        timestamp: string;
      }> = [];

      for (
        const classInput of
        input.classes
      ) {
        const grade =
          getTimetableV2Grade(
            classInput.gradeId,
          );

        if (!grade) {
          throw new Error(
            "INVALID_GRADE",
          );
        }

        const sectionName =
          normalizeText(
            classInput.sectionName,
          );

        const className =
          `${grade.name} ${sectionName}`;

        const resolved =
          classInput.customPlan
            ? await resolveCustomClassCurriculum(
                tx,
                schoolAccountId,
                grade,
                classInput,
              )
            : resolveSystemClassCurriculum(
                classInput,
                grade,
                input.semester,
              );

        const classRecord =
          await tx.timetableClass.create(
            {
              data: {
                projectId:
                  project.id,

                name: className,

                isActive: true,
              },
            },
          );

        for (
          const planSubject of
          resolved.subjects
        ) {
          const canonicalName =
            normalizeText(
              planSubject.canonicalName,
            );

          let subject =
            subjectByName.get(
              canonicalName,
            );

          if (!subject) {
            const created =
              await tx.timetableSubject.create(
                {
                  data: {
                    projectId:
                      project.id,

                    name:
                      canonicalName,

                    catalogKey:
                      canonicalName,

                    isActive: true,
                  },
                  select: {
                    id: true,
                    name: true,
                  },
                },
              );

            subject = created;

            subjectByName.set(
              canonicalName,
              created,
            );
          }

          await tx.timetableClassSubject.create(
            {
              data: {
                projectId:
                  project.id,

                classId:
                  classRecord.id,

                subjectId:
                  subject.id,

                weeklyLessons:
                  planSubject.weeklyPeriods,
              },
            },
          );
        }

        classPlanMetadata.push(
          {
            classId:
              classRecord.id,

            className,

            stageId:
              grade.stageId,

            gradeId:
              grade.id,

            sectionIndex:
              classInput.sectionIndex,

            sectionName,

            planSourceId:
              classInput.planSourceId,

            planName:
              resolved.planName,

            planType:
              resolved.planType,

            planTemplateId:
              resolved.templateId ??
              undefined,

            timestamp:
              new Date().toISOString(),
          },
        );
      }

      if (
        input.teacherCount > 0
      ) {
        await tx.timetableTeacher.createMany(
          {
            data: Array.from(
              {
                length:
                  input.teacherCount,
              },
              (_, index) => ({
                projectId:
                  project.id,

                name:
                  `معلم ${index + 1}`,

                specialty: null,

                maxWeeklyLoad: 24,

                isActive: true,
              }),
            ),
          },
        );
      }

      const currentSettings =
        project.settingsJson &&
        typeof project.settingsJson ===
          "object" &&
        !Array.isArray(
          project.settingsJson,
        )
          ? project.settingsJson
          : {};

      await tx.timetableProject.update(
        {
          where: {
            id: project.id,
          },
          data: {
            settingsJson: {
              ...(currentSettings as Record<
                string,
                unknown
              >),

              timetableV2: {
                version: 2,

                semesterId:
                  input.semester,

                stageIds:
                  input.stageIds,

                teacherTarget:
                  input.teacherCount,

                weeklyPeriodTarget:
                  input.weeklyPeriodTarget ??
                  null,

                stageWeeklyPeriodTargets:
                  input.stageWeeklyPeriodTargets ??
                  {},

                studyDays:
                  input.studyDays,

                periodsPerDay:
                  input.periodsPerDay,

                classPlans:
                  classPlanMetadata,
              },
            } as Prisma.InputJsonValue,
          },
        },
      );

      return tx.timetableProject.findUniqueOrThrow(
        {
          where: {
            id: project.id,
          },
          include: {
            teachers: true,
            classes: true,
            subjects: true,
            classSubjects: {
              include: {
                class: true,
                subject: true,
              },
            },
          },
        },
      );
    },
  );
}
export async function getTimetableV2ProjectSummary(
  projectId: string,
  schoolAccountId: string,
) {
  return prisma.timetableProject.findFirst({
    where: {
      id: projectId,
      schoolAccountId,
    },
    include: {
      teachers: {
        orderBy: {
          createdAt: "asc",
        },
      },
      classes: {
        orderBy: {
          createdAt: "asc",
        },
      },
      subjects: {
        orderBy: {
          name: "asc",
        },
      },
      classSubjects: {
        include: {
          class: true,
          subject: true,
        },
      },
    },
  });
}
