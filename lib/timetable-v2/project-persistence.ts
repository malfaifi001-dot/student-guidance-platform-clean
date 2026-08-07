import "server-only";

import {
  Prisma,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import {
  getTimetableV2CurriculumPlanBySourceId,
  getTimetableV2Grade,
  type TimetableV2SemesterId,
  type TimetableV2StageId,
  type TimetableV2StudyDayId,
} from "@/lib/timetable-v2";

export type TimetableV2CreateClassInput = {
  gradeId: string;
  sectionIndex: number;
  sectionName: string;
  planSourceId: string;
};

export type CreateTimetableV2ProjectInput = {
  name: string;
  academicYear: string;
  semester: TimetableV2SemesterId;

  stageIds: TimetableV2StageId[];

  teacherCount: number;

  weeklyPeriodTarget?: number | null;

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
        gradeId: string;
        sectionIndex: number;
        sectionName: string;
        planSourceId: string;
        planName: string;
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

        const plan =
          getTimetableV2CurriculumPlanBySourceId(
            classInput.planSourceId,
          );

        if (!plan) {
          throw new Error(
            "CURRICULUM_PLAN_NOT_FOUND",
          );
        }

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
          plan.subjects
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

            gradeId:
              grade.id,

            sectionIndex:
              classInput.sectionIndex,

            sectionName,

            planSourceId:
              plan.sourceId,

            planName:
              plan.sourceName,
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