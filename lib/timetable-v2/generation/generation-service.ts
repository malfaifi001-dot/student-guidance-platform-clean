import "server-only";

import {
  createHash,
} from "node:crypto";

import {
  Prisma,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import {
  analyzeTimetableV2Readiness,
} from "@/lib/timetable-v2/readiness-analysis";

import {
  ENGINE_VERSION,
  generateTimetableV2,
} from "./generation-engine";

import type {
  GenerationConstraint,
  GenerationFixedSlot,
  GenerationProblem,
} from "./generation-domain";

type DayJson = {
  id: string;
  label: string;
  order: number;
};

type PeriodJson = {
  id: string;
  label: string;
  order: number;
  isBreak: boolean;
};

function normalizeRecord(
  value: unknown,
): Record<string, unknown> {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as
      Record<string, unknown>;
  }

  return {};
}

function normalizeDays(
  value: unknown,
): DayJson[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap(
    (
      item,
      index,
    ) => {
      if (
        !item ||
        typeof item !==
          "object"
      ) {
        return [];
      }

      const record =
        item as
          Record<string, unknown>;

      const id =
        String(
          record.id ?? "",
        ).trim();

      const label =
        String(
          record.label ?? "",
        ).trim();

      if (
        !id ||
        !label
      ) {
        return [];
      }

      return [
        {
          id,
          label,

          order:
            typeof record.order ===
              "number"
              ? record.order
              : index + 1,
        },
      ];
    },
  );
}

function normalizePeriods(
  value: unknown,
): PeriodJson[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap(
    (
      item,
      index,
    ) => {
      if (
        !item ||
        typeof item !==
          "object"
      ) {
        return [];
      }

      const record =
        item as
          Record<string, unknown>;

      const id =
        String(
          record.id ?? "",
        ).trim();

      const label =
        String(
          record.label ?? "",
        ).trim();

      if (
        !id ||
        !label
      ) {
        return [];
      }

      return [
        {
          id,
          label,

          order:
            typeof record.order ===
              "number"
              ? record.order
              : index + 1,

          isBreak:
            record.isBreak ===
            true,
        },
      ];
    },
  );
}

function normalizeFixedSlots(
  value: unknown,
): GenerationFixedSlot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen =
    new Set<string>();

  const result:
    GenerationFixedSlot[] =
      [];

  for (
    const item of value
  ) {
    if (
      !item ||
      typeof item !==
        "object"
    ) {
      continue;
    }

    const record =
      item as
        Record<string, unknown>;

    const dayId =
      String(
        record.dayId ?? "",
      ).trim();

    const periodId =
      String(
        record.periodId ?? "",
      ).trim();

    if (
      !dayId ||
      !periodId
    ) {
      continue;
    }

    const key =
      `${dayId}:${periodId}`;

    if (
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);

    result.push({
      dayId,
      periodId,

      isLocked:
        record.isLocked !==
        false,
    });
  }

  return result;
}

function getWeight(
  value: unknown,
) {
  const record =
    normalizeRecord(value);

  const weight =
    record.weight;

  if (
    typeof weight ===
      "number" &&
    Number.isFinite(
      weight,
    )
  ) {
    return Math.max(
      1,
      Math.min(
        100,
        Math.round(
          weight,
        ),
      ),
    );
  }

  return 1;
}

async function requireProject(
  projectId: string,
  schoolAccountId: string,
) {
  const project =
    await prisma.timetableProject.findFirst({
      where: {
        id:
          projectId,

        schoolAccountId,
      },

      select: {
        id: true,
        name: true,
        academicYear: true,
        semester: true,
        status: true,

        daysJson: true,
        periodsJson: true,
        settingsJson: true,
      },
    });

  if (!project) {
    throw new Error(
      "PROJECT_NOT_FOUND",
    );
  }

  return project;
}

async function loadProblem(
  projectId: string,
  schoolAccountId: string,
) {
  const project =
    await requireProject(
      projectId,
      schoolAccountId,
    );

  const [
    teachers,
    classes,
    subjects,
    assignments,
    constraints,
  ] = await Promise.all([
    prisma.timetableTeacher.findMany({
      where: {
        projectId,
        isActive: true,
      },

      orderBy: {
        createdAt: "asc",
      },

      select: {
        id: true,
        name: true,
        specialty: true,
        maxWeeklyLoad: true,
      },
    }),

    prisma.timetableClass.findMany({
      where: {
        projectId,
        isActive: true,
      },

      orderBy: {
        createdAt: "asc",
      },

      select: {
        id: true,
        name: true,
      },
    }),

    prisma.timetableSubject.findMany({
      where: {
        projectId,
        isActive: true,
      },

      orderBy: {
        name: "asc",
      },

      select: {
        id: true,
        name: true,
      },
    }),

    prisma.timetableAssignment.findMany({
      where: {
        projectId,
      },

      orderBy: {
        createdAt: "asc",
      },

      include: {
        teacher: {
          select: {
            id: true,
            name: true,
          },
        },

        class: {
          select: {
            id: true,
            name: true,
          },
        },

        subject: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),

    prisma.timetableConstraint.findMany({
      where: {
        projectId,
        isActive: true,
      },

      orderBy: {
        createdAt: "asc",
      },

      include: {
        teachers: true,
        subjects: true,
        classes: true,
        days: true,
        periods: true,
        slots: true,
      },
    }),
  ]);

  const days =
    normalizeDays(
      project.daysJson,
    ).sort(
      (a, b) =>
        a.order -
        b.order,
    );

  const periods =
    normalizePeriods(
      project.periodsJson,
    )
      .filter(
        (period) =>
          !period.isBreak,
      )
      .sort(
        (a, b) =>
          a.order -
          b.order,
      );

  const normalizedConstraints:
    GenerationConstraint[] =
      constraints.map(
        (constraint) => ({
          id:
            constraint.id,

          type:
            constraint.type,

          strength:
            constraint.strength,

          valueInt:
            constraint.valueInt,

          weight:
            getWeight(
              constraint.configJson,
            ),

          teacherIds:
            constraint.teachers.map(
              (item) =>
                item.teacherId,
            ),

          subjectIds:
            constraint.subjects.map(
              (item) =>
                item.subjectId,
            ),

          classIds:
            constraint.classes.map(
              (item) =>
                item.classId,
            ),

          dayIds:
            constraint.days.map(
              (item) =>
                item.dayId,
            ),

          periodIds:
            constraint.periods.map(
              (item) =>
                item.periodId,
            ),

          slots:
            constraint.slots.map(
              (item) => ({
                dayId:
                  item.dayId,

                periodId:
                  item.periodId,
              }),
            ),

          configJson:
            normalizeRecord(
              constraint.configJson,
            ),
        }),
      );

  const problem:
    GenerationProblem = {
      projectId,

      days,

      periods,

      teachers:
        teachers.map(
          (teacher) => ({
            id:
              teacher.id,

            name:
              teacher.name,

            specialty:
              teacher.specialty,

            maxWeeklyLoad:
              teacher.maxWeeklyLoad,
          }),
        ),

      classes,
      subjects,

      assignments:
        assignments.map(
          (assignment) => ({
            id:
              assignment.id,

            teacherId:
              assignment.teacherId,

            teacherName:
              assignment.teacher.name,

            classId:
              assignment.classId,

            className:
              assignment.class.name,

            subjectId:
              assignment.subjectId,

            subjectName:
              assignment.subject.name,

            assignedLessons:
              assignment.assignedLessons,

            singlePeriods:
              assignment.singlePeriods,

            doublePeriods:
              assignment.doublePeriods,

            fixedSlots:
              normalizeFixedSlots(
                assignment.fixedSlotsJson,
              ),
          }),
        ),

      constraints:
        normalizedConstraints,
    };

  const fingerprintPayload =
    JSON.stringify({
      days,

      periods,

      teachers:
        problem.teachers
          .map(
            (teacher) => ({
              id:
                teacher.id,

              maxWeeklyLoad:
                teacher.maxWeeklyLoad,
            }),
          )
          .sort(
            (a, b) =>
              a.id.localeCompare(
                b.id,
              ),
          ),

      assignments:
        problem.assignments
          .map(
            (assignment) => ({
              id:
                assignment.id,

              teacherId:
                assignment.teacherId,

              classId:
                assignment.classId,

              subjectId:
                assignment.subjectId,

              assignedLessons:
                assignment.assignedLessons,

              singlePeriods:
                assignment.singlePeriods,

              doublePeriods:
                assignment.doublePeriods,

              fixedSlots:
                assignment.fixedSlots
                  .map(
                    (slot) => ({
                      dayId:
                        slot.dayId,

                      periodId:
                        slot.periodId,

                      isLocked:
                        slot.isLocked,
                    }),
                  )
                  .sort(
                    (a, b) =>
                      `${a.dayId}:${a.periodId}`.localeCompare(
                        `${b.dayId}:${b.periodId}`,
                      ),
                  ),
            }),
          )
          .sort(
            (a, b) =>
              a.id.localeCompare(
                b.id,
              ),
          ),

      constraints:
        normalizedConstraints
          .map(
            (constraint) => ({
              id:
                constraint.id,

              type:
                constraint.type,

              strength:
                constraint.strength,

              valueInt:
                constraint.valueInt,

              weight:
                constraint.weight,

              teacherIds:
                [...constraint.teacherIds].sort(),

              subjectIds:
                [...constraint.subjectIds].sort(),

              classIds:
                [...constraint.classIds].sort(),

              dayIds:
                [...constraint.dayIds].sort(),

              periodIds:
                [...constraint.periodIds].sort(),

              slots:
                constraint.slots
                  .map(
                    (slot) =>
                      `${slot.dayId}:${slot.periodId}`,
                  )
                  .sort(),
            }),
          )
          .sort(
            (a, b) =>
              a.id.localeCompare(
                b.id,
              ),
          ),
    });

  const fingerprint =
    createHash(
      "sha256",
    )
      .update(
        fingerprintPayload,
      )
      .digest(
        "hex",
      );

  return {
    project,
    problem,
    fingerprint,
  };
}

async function assertFreshSchedule(
  projectId: string,
  scheduleId: string,
  schoolAccountId: string,
) {
  const {
    fingerprint,
    problem,
  } =
    await loadProblem(
      projectId,
      schoolAccountId,
    );

  const schedule =
    await prisma.timetableSchedule.findFirst({
      where: {
        id:
          scheduleId,

        projectId,

        project: {
          schoolAccountId,
        },
      },

      select: {
        id: true,
        status: true,
        dataFingerprint: true,
        hardViolations: true,
        completeness: true,

        entries: {
          orderBy: [
            {
              dayId:
                "asc",
            },
            {
              periodOrder:
                "asc",
            },
            {
              className:
                "asc",
            },
          ],

          select: {
            id: true,

            assignmentId:
              true,

            teacherId:
              true,

            teacherName:
              true,

            classId:
              true,

            className:
              true,

            subjectId:
              true,

            subjectName:
              true,

            dayId:
              true,

            dayLabel:
              true,

            periodId:
              true,

            periodLabel:
              true,

            periodOrder:
              true,

            isLocked:
              true,

            source:
              true,

            placementScore:
              true,

            metadataJson:
              true,
          },
        },
      },
    });

  if (!schedule) {
    throw new Error(
      "SCHEDULE_NOT_FOUND",
    );
  }

  if (
    schedule.dataFingerprint !==
    fingerprint
  ) {
    throw new Error(
      "SCHEDULE_STALE",
    );
  }

  if (
    schedule.completeness !==
      100 ||
    schedule.hardViolations !==
      0
  ) {
    throw new Error(
      "SCHEDULE_VALIDATION_FAILED",
    );
  }

  /*
   * الحصص المزدوجة تحتاج block metadata.
   *
   * النسخ الجديدة والمولدة أصلًا تحفظ:
   * blockId / blockIndex / blockLength.
   *
   * لو وجدنا نسخة قديمة معدلة يدويًا فقدت هذه البيانات،
   * لا نعتمدها إذا كان المشروع يستخدم double periods.
   */
  const projectHasDoublePeriods =
    problem.assignments.some(
      (assignment) =>
        assignment.doublePeriods >
        0,
    );

  const missingRequiredBlockMetadata =
    projectHasDoublePeriods &&
    schedule.entries.some(
      (entry) => {
        const metadata =
          normalizeRecord(
            entry.metadataJson,
          );

        return (
          typeof metadata.blockId !==
            "string" ||
          typeof metadata.blockIndex !==
            "number" ||
          typeof metadata.blockLength !==
            "number"
        );
      },
    );

  if (
    missingRequiredBlockMetadata
  ) {
    throw new Error(
      "SCHEDULE_BLOCK_METADATA_REQUIRED",
    );
  }

  const {
    validateGeneratedTimetableV2,
  } =
    await import(
      "./generation-validator"
    );

  const sessions =
    schedule.entries.map(
      (
        entry,
        index,
      ) => {
        const metadata =
          normalizeRecord(
            entry.metadataJson,
          );

        const blockId =
          typeof metadata.blockId ===
            "string"
            ? metadata.blockId
            : entry.id;

        const blockIndex =
          typeof metadata.blockIndex ===
            "number"
            ? metadata.blockIndex
            : 0;

        const blockLength =
          metadata.blockLength ===
            2
            ? 2
            : 1;

        return {
          temporaryId:
            entry.id ||
            `${schedule.id}:${index}`,

          blockId,

          blockIndex,

          blockLength,

          assignmentId:
            entry.assignmentId ??
            "",

          teacherId:
            entry.teacherId,

          teacherName:
            entry.teacherName,

          classId:
            entry.classId,

          className:
            entry.className,

          subjectId:
            entry.subjectId,

          subjectName:
            entry.subjectName,

          dayId:
            entry.dayId,

          dayLabel:
            entry.dayLabel,

          periodId:
            entry.periodId,

          periodLabel:
            entry.periodLabel,

          periodOrder:
            entry.periodOrder,

          isLocked:
            entry.isLocked,

          /*
           * المصدر لا يدخل في منطق الـvalidator.
           * قد تكون القيمة GENERATED أو MANUAL_MOVE أو MANUAL_SWAP.
           */
          source:
            entry.source,

          placementScore:
            entry.placementScore,
        };
      },
    ) as Parameters<
      typeof validateGeneratedTimetableV2
    >[1];

  const validation =
    validateGeneratedTimetableV2(
      problem,
      sessions,
    );

  if (
    !validation.valid
  ) {
    throw new Error(
      "SCHEDULE_RUNTIME_VALIDATION_FAILED",
    );
  }

  return schedule;
}

async function syncOperationalSchedule(
  tx:
    Prisma.TransactionClient,
  projectId: string,
  scheduleId: string,
) {
  const [
    project,
    schedule,
  ] =
    await Promise.all([
      tx.timetableProject.findUnique({
        where: {
          id:
            projectId,
        },

        select: {
          settingsJson:
            true,
        },
      }),

      tx.timetableSchedule.findUnique({
        where: {
          id:
            scheduleId,
        },

        include: {
          entries: {
            orderBy: [
              {
                dayId:
                  "asc",
              },
              {
                periodOrder:
                  "asc",
              },
              {
                className:
                  "asc",
              },
            ],
          },
        },
      }),
    ]);

  if (
    !project ||
    !schedule
  ) {
    throw new Error(
      "SCHEDULE_NOT_FOUND",
    );
  }

  const settings =
    normalizeRecord(
      project.settingsJson,
    );

  const generatedSchedule =
    schedule.entries.map(
      (entry) => ({
        id:
          entry.id,

        assignmentId:
          entry.assignmentId,

        teacherId:
          entry.teacherId,

        teacherName:
          entry.teacherName,

        classId:
          entry.classId,

        className:
          entry.className,

        subjectId:
          entry.subjectId,

        subjectName:
          entry.subjectName,

        dayId:
          entry.dayId,

        dayLabel:
          entry.dayLabel,

        periodId:
          entry.periodId,

        periodLabel:
          entry.periodLabel,

        periodOrder:
          entry.periodOrder,

        isLocked:
          entry.isLocked,
      }),
    );

  await tx.timetableProject.update({
    where: {
      id:
        projectId,
    },

    data: {
      settingsJson: {
        ...settings,

        generatedSchedule,

        generatedAt:
          schedule.generatedAt.toISOString(),

        activeScheduleId:
          schedule.id,

        activeScheduleVersion:
          schedule.version,

        activeScheduleEngine:
          schedule.engineVersion,

        activeScheduleFingerprint:
          schedule.dataFingerprint,

        operationalScheduleId:
          schedule.id,

        operationalScheduleVersion:
          schedule.version,
      },
    },
  });
}

async function saveGeneratedSchedule(
  projectId: string,
  createdById: string,
  fingerprint: string,
  result:
    ReturnType<
      typeof generateTimetableV2
    >,
) {
  let lastError:
    unknown;

  for (
    let retry = 0;
    retry < 3;
    retry += 1
  ) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const latest =
            await tx.timetableSchedule.aggregate({
              where: {
                projectId,
              },

              _max: {
                version: true,
              },
            });

          const version =
            (
              latest._max.version ??
              0
            ) + 1;

          await tx.timetableSchedule.updateMany({
            where: {
              projectId,
              isCurrent:
                true,
            },

            data: {
              isCurrent:
                false,
            },
          });

          const schedule =
            await tx.timetableSchedule.create({
              data: {
                projectId,

                version,

                status:
                  "GENERATED",

                isCurrent:
                  true,

                score:
                  result.best.score,

                completeness:
                  result.best.completeness,

                hardViolations:
                  result.best.validation
                    .hardViolationCount,

                softPenalty:
                  result.best.softPenalty,

                attemptCount:
                  result.attemptCount,

                seed:
                  result.seed,

                durationMs:
                  result.durationMs,

                engineVersion:
                  ENGINE_VERSION,

                dataFingerprint:
                  fingerprint,

                createdById,

                diagnosticsJson:
                  result.diagnostics as
                    unknown as
                    Prisma.InputJsonValue,

                configJson: {
                  attempts:
                    result.attemptCount,

                  completedAttempts:
                    result.completedAttempts,

                  scoreBreakdown:
                    result.best.scoreBreakdown,

                  validation:
                    result.best.validation,
                } as Prisma.InputJsonValue,

                entries: {
                  create:
                    result.best.sessions.map(
                      (session) => ({
                        assignmentId:
                          session.assignmentId,

                        teacherId:
                          session.teacherId,

                        teacherName:
                          session.teacherName,

                        classId:
                          session.classId,

                        className:
                          session.className,

                        subjectId:
                          session.subjectId,

                        subjectName:
                          session.subjectName,

                        dayId:
                          session.dayId,

                        dayLabel:
                          session.dayLabel,

                        periodId:
                          session.periodId,

                        periodLabel:
                          session.periodLabel,

                        periodOrder:
                          session.periodOrder,

                        isLocked:
                          session.isLocked,

                        source:
                          session.source,

                        placementScore:
                          session.placementScore,

                        metadataJson: {
                          blockId:
                            session.blockId,

                          blockIndex:
                            session.blockIndex,

                          blockLength:
                            session.blockLength,
                        },
                      }),
                    ),
                },
              },
            });

          const project =
            await tx.timetableProject.findUnique({
              where: {
                id:
                  projectId,
              },

              select: {
                status: true,
              },
            });

          if (
            project &&
            ![
              "APPROVED",
              "PUBLISHED",
            ].includes(
              project.status,
            )
          ) {
            await tx.timetableProject.update({
              where: {
                id:
                  projectId,
              },

              data: {
                status:
                  "GENERATED",
              },
            });
          }

          return tx.timetableSchedule.findUnique({
            where: {
              id:
                schedule.id,
            },

            include: {
              entries: {
                orderBy: [
                  {
                    dayId:
                      "asc",
                  },
                  {
                    periodOrder:
                      "asc",
                  },
                  {
                    className:
                      "asc",
                  },
                ],
              },
            },
          });
        },
      );
    }
    catch (error) {
      lastError =
        error;

      if (
        !(
          error instanceof
            Prisma.PrismaClientKnownRequestError
        ) ||
        error.code !==
          "P2002"
      ) {
        throw error;
      }
    }
  }

  throw lastError;
}

export async function loadTimetableV2GenerationProblemForSolver(
  projectId: string,
  schoolAccountId: string,
) {
  return loadProblem(
    projectId,
    schoolAccountId,
  );
}
export async function generateAndSaveTimetableV2(
  projectId: string,
  schoolAccountId: string,
  createdById: string,
  input: {
    attempts: number;
    seed: number;
  },
) {
  const readiness =
    await analyzeTimetableV2Readiness(
      projectId,
      schoolAccountId,
    );

  if (
    !readiness.canGenerate
  ) {
    return {
      ok:
        false as const,

      reason:
        "READINESS_BLOCKED" as const,

      readiness: {
        score:
          readiness.score,

        errors:
          readiness.issues
            .filter(
              (issue) =>
                issue.severity ===
                "ERROR",
            )
            .slice(
              0,
              20,
            ),
      },
    };
  }

  const {
    problem,
    fingerprint,
  } =
    await loadProblem(
      projectId,
      schoolAccountId,
    );

  const result =
    generateTimetableV2(
      problem,
      {
        attempts:
          input.attempts,

        seed:
          input.seed,

        maxNodesPerAttempt:
          12000,

        maxCandidatesPerTask:
          8,
      },
    );

  if (
    !result.success ||
    !result.best.validation.valid ||
    result.best.validation
      .hardViolationCount >
      0
  ) {
    return {
      ok:
        false as const,

      reason:
        "GENERATION_FAILED" as const,

      result,
    };
  }

  const schedule =
    await saveGeneratedSchedule(
      projectId,
      createdById,
      fingerprint,
      result,
    );

  return {
    ok:
      true as const,

    schedule,
    result,
  };
}

export async function getTimetableV2GenerationWorkspace(
  projectId: string,
  schoolAccountId: string,
) {
  const {
    project,
    fingerprint,
  } =
    await loadProblem(
      projectId,
      schoolAccountId,
    );

  const [
    versions,
    current,
    classes,
  ] =
    await Promise.all([
      prisma.timetableSchedule.findMany({
        where: {
          projectId,
        },

        orderBy: {
          version:
            "desc",
        },

        take: 20,

        select: {
          id: true,
          version: true,
          status: true,
          isCurrent: true,

          score: true,
          completeness: true,

          hardViolations: true,
          softPenalty: true,

          attemptCount: true,
          seed: true,
          durationMs: true,

          engineVersion: true,
          dataFingerprint: true,

          generatedAt: true,
          createdAt: true,

          _count: {
            select: {
              entries: true,
            },
          },
        },
      }),

      prisma.timetableSchedule.findFirst({
        where: {
          projectId,
          isCurrent: true,
        },

        orderBy: {
          version:
            "desc",
        },

        include: {
          entries: {
            orderBy: [
              {
                dayId:
                  "asc",
              },
              {
                periodOrder:
                  "asc",
              },
              {
                className:
                  "asc",
              },
            ],
          },
        },
      }),

      prisma.timetableClass.findMany({
        where: {
          projectId,
          isActive: true,
        },

        orderBy: {
          createdAt:
            "asc",
        },

        select: {
          id: true,
          name: true,
        },
      }),
    ]);

  const days =
    normalizeDays(
      project.daysJson,
    ).sort(
      (a, b) =>
        a.order -
        b.order,
    );

  const periods =
    normalizePeriods(
      project.periodsJson,
    )
      .filter(
        (period) =>
          !period.isBreak,
      )
      .sort(
        (a, b) =>
          a.order -
          b.order,
      );

  return {
    project: {
      id:
        project.id,

      name:
        project.name,

      academicYear:
        project.academicYear,

      semester:
        project.semester,

      status:
        project.status,
    },

    days,
    periods,
    classes,

    versions,
    current,

    currentIsStale:
      current
        ? current.dataFingerprint !==
          fingerprint
        : false,

    currentFingerprint:
      fingerprint,
  };
}

export async function activateTimetableV2Schedule(
  projectId: string,
  scheduleId: string,
  schoolAccountId: string,
) {
  await requireProject(
    projectId,
    schoolAccountId,
  );

  const schedule =
    await prisma.timetableSchedule.findFirst({
      where: {
        id:
          scheduleId,

        projectId,
      },

      select: {
        id: true,
      },
    });

  if (!schedule) {
    throw new Error(
      "SCHEDULE_NOT_FOUND",
    );
  }

  return prisma.$transaction(
    async (tx) => {
      await tx.timetableSchedule.updateMany({
        where: {
          projectId,
          isCurrent: true,
        },

        data: {
          isCurrent:
            false,
        },
      });

      return tx.timetableSchedule.update({
        where: {
          id:
            scheduleId,
        },

        data: {
          isCurrent:
            true,
        },
      });
    },
  );
}

export async function approveTimetableV2Schedule(
  projectId: string,
  scheduleId: string,
  schoolAccountId: string,
) {
  await assertFreshSchedule(
    projectId,
    scheduleId,
    schoolAccountId,
  );

  return prisma.$transaction(
    async (tx) => {
      await tx.timetableSchedule.updateMany({
        where: {
          projectId,
          isCurrent: true,
        },

        data: {
          isCurrent:
            false,
        },
      });

      const schedule =
        await tx.timetableSchedule.update({
          where: {
            id:
              scheduleId,
          },

          data: {
            status:
              "APPROVED",

            isCurrent:
              true,
          },
        });

      const project =
        await tx.timetableProject.findUnique({
          where: {
            id:
              projectId,
          },

          select: {
            status: true,
          },
        });

      if (
        project?.status !==
        "PUBLISHED"
      ) {
        await tx.timetableProject.update({
          where: {
            id:
              projectId,
          },

          data: {
            status:
              "APPROVED",
          },
        });
      }

      return schedule;
    },
  );
}

export async function publishTimetableV2Schedule(
  projectId: string,
  scheduleId: string,
  schoolAccountId: string,
) {
  const existing =
    await assertFreshSchedule(
      projectId,
      scheduleId,
      schoolAccountId,
    );

  if (
    existing.status !==
      "APPROVED" &&
    existing.status !==
      "PUBLISHED"
  ) {
    throw new Error(
      "SCHEDULE_NOT_APPROVED",
    );
  }

  return prisma.$transaction(
    async (tx) => {
      await tx.timetableSchedule.updateMany({
        where: {
          projectId,

          status:
            "PUBLISHED",

          id: {
            not:
              scheduleId,
          },
        },

        data: {
          status:
            "ARCHIVED",

          isCurrent:
            false,
        },
      });

      await tx.timetableSchedule.updateMany({
        where: {
          projectId,

          isCurrent:
            true,

          id: {
            not:
              scheduleId,
          },
        },

        data: {
          isCurrent:
            false,
        },
      });

      const schedule =
        await tx.timetableSchedule.update({
          where: {
            id:
              scheduleId,
          },

          data: {
            status:
              "PUBLISHED",

            isCurrent:
              true,
          },
        });

      await tx.timetableProject.update({
        where: {
          id:
            projectId,
        },

        data: {
          status:
            "PUBLISHED",
        },
      });

      await syncOperationalSchedule(
        tx,
        projectId,
        scheduleId,
      );

      return schedule;
    },
  );
}