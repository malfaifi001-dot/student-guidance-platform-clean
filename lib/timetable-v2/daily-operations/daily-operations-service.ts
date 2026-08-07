import "server-only";

import {
  Prisma,
  TimetableSubstitutionStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type {
  AssignSubstituteInput,
  CreateAbsenceInput,
  SupervisionDutyInput,
  UpdateSubstitutionInput,
  WaitingPolicyInput,
} from "@/lib/timetable-v2/daily-operations/daily-operations-schemas";

type JsonRecord = Record<string, unknown>;

type ScheduleSession = {
  id: string;
  assignmentId?: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  dayId: string;
  dayLabel?: string;
  periodId: string;
  periodLabel?: string;
  periodOrder: number;
};

type TimetableDay = {
  id: string;
  label: string;
  order: number;
};

type TimetablePeriod = {
  id: string;
  label: string;
  order: number;
  isBreak?: boolean;
};

type CandidateReasonCode =
  | "LOW_WEEKLY_LOAD"
  | "HIGH_REMAINING_BALANCE"
  | "LOW_WEEKLY_WAITING"
  | "LOW_DAILY_WAITING"
  | "INSIDE_GAP"
  | "MATCHING_SPECIALTY"
  | "MANUAL_PRIORITY";

type ExclusionCode =
  | "ORIGINAL_TEACHER"
  | "INACTIVE_TEACHER"
  | "BUSY_IN_PERIOD"
  | "ABSENT_ON_DATE"
  | "ALREADY_ASSIGNED_IN_PERIOD"
  | "DAILY_LIMIT_REACHED"
  | "WEEKLY_LIMIT_REACHED"
  | "BEFORE_FIRST_LESSON"
  | "AFTER_LAST_LESSON"
  | "INSIDE_GAP_NOT_ALLOWED"
  | "GOLDEN_DAY"
  | "EXCLUDED_DAY"
  | "EXCLUDED_PERIOD"
  | "CONSECUTIVE_WAITING"
  | "FIRST_PERIOD_DISABLED"
  | "LAST_PERIOD_DISABLED"
  | "SPECIALTY_MISMATCH"
  | "SUPERVISION_CONFLICT";

type CandidateSnapshot = {
  teacherId: string;
  teacherName: string;
  specialty: string | null;
  weeklyLoad: number;
  referenceLoad: number;
  basicBalance: number;
  weeklyExecuted: number;
  dailyExecuted: number;
  remainingBalance: number;
  score: number;
  rank: number;
  reasons: CandidateReasonCode[];
  reasonLabels: string[];
};

type ExcludedTeacherSnapshot = {
  teacherId: string;
  teacherName: string;
  codes: ExclusionCode[];
  reasons: string[];
};

/**
 * V2 operational source of truth.
 *
 * Daily operations must never depend on:
 * project.settingsJson.generatedSchedule
 *
 * The operational timetable is the latest schedule whose
 * status is PUBLISHED, and its TimetableScheduleEntry rows.
 */
async function loadPublishedSchedule(
  projectId: string,
  schoolAccountId: string,
): Promise<ScheduleSession[]> {
  const published =
    await prisma.timetableSchedule.findFirst({
      where: {
        projectId,

        status:
          "PUBLISHED",

        project: {
          schoolAccountId,
        },
      },

      orderBy: {
        version:
          "desc",
      },

      select: {
        id:
          true,

        version:
          true,

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
            id:
              true,

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
          },
        },
      },
    });

  if (!published) {
    return [];
  }

  return published.entries.map(
    (entry) => ({
      /*
       * مهم:
       * originalSessionId في عمليات الانتظار سيشير
       * الآن إلى TimetableScheduleEntry.id الحقيقي.
       */
      id:
        entry.id,

      assignmentId:
        entry.assignmentId ??
        undefined,

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
    }),
  );
}
const defaultPolicy = {
  candidateCount: 6,
  maxDailySubstitutions: 1,
  maxWeeklySubstitutions: 5,

  allowBeforeFirstLesson: false,
  allowAfterLastLesson: false,
  allowInsideGap: true,
  preferInsideGap: true,

  allowOnGoldenDay: false,
  goldenDayEmergency: false,

  allowAfterLateArrival: true,
  excludeLateArrivalDay: false,
  allowBeforeEarlyDeparture: true,

  preventConsecutiveSubstitutions: true,
  preventFirstPeriod: false,
  preventLastPeriod: false,

  requireMatchingSpecialty: false,
  preferMatchingSpecialty: true,

  weeklyLoadWeight: 100,
  weeklyWaitingWeight: 40,
  dailyWaitingWeight: 60,
  gapPreferenceWeight: 20,
  specialtyWeight: 15,
  firstLastFairnessWeight: 10,

  settingsJson: {},
};

export async function getDailyOperationsDashboard(
  projectId: string,
  schoolAccountId: string,
) {
  const project =
    await prisma.timetableProject.findFirst({
      where: {
        id: projectId,
        schoolAccountId,
      },
      include: {
        teachers: {
          where: {
            isActive: true,
          },
          include: {
            assignments: {
              select: {
                assignedLessons: true,
              },
            },
          },
          orderBy: {
            name: "asc",
          },
        },
        waitingPolicy: true,
        dailyAbsences: {
          orderBy: [
            {
              absenceDate: "desc",
            },
            {
              createdAt: "desc",
            },
          ],
          take: 60,
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                specialty: true,
              },
            },
            substitutions: {
              orderBy: {
                periodId: "asc",
              },
              include: {
                substituteTeacher: {
                  select: {
                    id: true,
                    name: true,
                    specialty: true,
                  },
                },
              },
            },
          },
        },
        supervisionDuties: {
          orderBy: [
            {
              dayId: "asc",
            },
            {
              createdAt: "desc",
            },
          ],
          include: {
            assignments: {
              orderBy: {
                sortOrder: "asc",
              },
              include: {
                teacher: {
                  select: {
                    id: true,
                    name: true,
                    specialty: true,
                  },
                },
              },
            },
          },
        },
      },
    });

  if (!project) {
    return null;
  }

  const schedule =
    await loadPublishedSchedule(
      projectId,
      schoolAccountId,
    );

  const days = normalizeDays(project.daysJson);
  const periods = normalizePeriods(
    project.periodsJson,
  );

  const teachers = project.teachers.map(
    (teacher) => {
      const weeklyLoad =
        teacher.assignments.reduce(
          (total, item) =>
            total + item.assignedLessons,
          0,
        );

      return {
        id: teacher.id,
        name: teacher.name,
        specialty: teacher.specialty,
        maxWeeklyLoad: teacher.maxWeeklyLoad,
        weeklyLoad,
      };
    },
  );

  return {
    project: {
      id: project.id,
      name: project.name,
      academicYear: project.academicYear,
      semester: project.semester,
      status: project.status,
    },
    teachers,
    days,
    periods,
    schedule,
    policy: project.waitingPolicy
      ? {
          ...project.waitingPolicy,
          settingsJson: normalizeRecord(
            project.waitingPolicy.settingsJson,
          ),
        }
      : defaultPolicy,
    absences: project.dailyAbsences,
    supervisionDuties:
      project.supervisionDuties,
  };
}

export async function saveWaitingPolicy(
  projectId: string,
  schoolAccountId: string,
  input: WaitingPolicyInput,
) {
  const project =
    await prisma.timetableProject.findFirst({
      where: {
        id: projectId,
        schoolAccountId,
      },
      select: {
        id: true,
      },
    });

  if (!project) {
    return null;
  }

  const data = {
    candidateCount: input.candidateCount,
    maxDailySubstitutions:
      input.maxDailySubstitutions,
    maxWeeklySubstitutions:
      input.maxWeeklySubstitutions,

    allowBeforeFirstLesson:
      input.allowBeforeFirstLesson,
    allowAfterLastLesson:
      input.allowAfterLastLesson,
    allowInsideGap: input.allowInsideGap,
    preferInsideGap: input.preferInsideGap,

    allowOnGoldenDay: input.allowOnGoldenDay,
    goldenDayEmergency:
      input.goldenDayEmergency,

    allowAfterLateArrival:
      input.allowAfterLateArrival,
    excludeLateArrivalDay:
      input.excludeLateArrivalDay,
    allowBeforeEarlyDeparture:
      input.allowBeforeEarlyDeparture,

    preventConsecutiveSubstitutions:
      input.preventConsecutiveSubstitutions,
    preventFirstPeriod:
      input.preventFirstPeriod,
    preventLastPeriod:
      input.preventLastPeriod,

    requireMatchingSpecialty:
      input.requireMatchingSpecialty,
    preferMatchingSpecialty:
      input.preferMatchingSpecialty,

    weeklyLoadWeight: input.weeklyLoadWeight,
    weeklyWaitingWeight:
      input.weeklyWaitingWeight,
    dailyWaitingWeight:
      input.dailyWaitingWeight,
    gapPreferenceWeight:
      input.gapPreferenceWeight,
    specialtyWeight: input.specialtyWeight,
    firstLastFairnessWeight:
      input.firstLastFairnessWeight,

    settingsJson:
      (input.settingsJson ||
        {}) as Prisma.InputJsonValue,
  };

  return prisma.timetableWaitingPolicy.upsert({
    where: {
      projectId,
    },
    update: data,
    create: {
      projectId,
      ...data,
    },
  });
}

export async function createAbsenceWithSuggestions(
  projectId: string,
  schoolAccountId: string,
  createdById: string,
  input: CreateAbsenceInput,
) {
  const project =
    await prisma.timetableProject.findFirst({
      where: {
        id: projectId,
        schoolAccountId,
      },
      include: {
        teachers: {
          where: {
            isActive: true,
          },
          include: {
            assignments: {
              select: {
                assignedLessons: true,
              },
            },
          },
        },
        waitingPolicy: true,
        supervisionDuties: {
          where: {
            status: {
              not: "CANCELED",
            },
          },
          include: {
            assignments: true,
          },
        },
      },
    });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  const absentTeacher = project.teachers.find(
    (teacher) =>
      teacher.id === input.teacherId,
  );

  if (!absentTeacher) {
    throw new Error("TEACHER_NOT_FOUND");
  }

  const schedule =
    await loadPublishedSchedule(
      projectId,
      schoolAccountId,
    );

  if (!schedule.length) {
    throw new Error("PUBLISHED_SCHEDULE_REQUIRED");
  }

  const policy = project.waitingPolicy || {
    id: "",
    projectId,
    ...defaultPolicy,
    settingsJson: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const periods = normalizePeriods(
    project.periodsJson,
  ).filter((period) => !period.isBreak);

  const periodOrder = new Map(
    periods.map((period, index) => [
      period.id,
      index,
    ]),
  );

  let absentSessions = schedule.filter(
    (session) =>
      session.teacherId === input.teacherId &&
      session.dayId === input.dayId,
  );

  if (
    input.absenceType === "SELECTED_PERIODS"
  ) {
    const selected = new Set(input.periodIds);

    absentSessions = absentSessions.filter(
      (session) =>
        selected.has(session.periodId),
    );
  }

  if (
    input.absenceType === "LATE_ARRIVAL" &&
    input.arrivalPeriodId
  ) {
    const arrivalIndex =
      periodOrder.get(input.arrivalPeriodId);

    absentSessions = absentSessions.filter(
      (session) => {
        const index = periodOrder.get(
          session.periodId,
        );

        return (
          arrivalIndex !== undefined &&
          index !== undefined &&
          index < arrivalIndex
        );
      },
    );
  }

  if (
    input.absenceType === "EARLY_DEPARTURE" &&
    input.departurePeriodId
  ) {
    const departureIndex =
      periodOrder.get(input.departurePeriodId);

    absentSessions = absentSessions.filter(
      (session) => {
        const index = periodOrder.get(
          session.periodId,
        );

        return (
          departureIndex !== undefined &&
          index !== undefined &&
          index > departureIndex
        );
      },
    );
  }

  if (!absentSessions.length) {
    throw new Error("NO_ABSENT_SESSIONS");
  }

  const absenceDate = parseDateOnly(
    input.absenceDate,
  );

  const weekRange = getWeekRange(absenceDate);
  const dayRange = getDayRange(absenceDate);

  const [
    activeAbsences,
    weeklySubstitutions,
    dailySubstitutions,
  ] = await Promise.all([
    prisma.timetableDailyAbsence.findMany({
      where: {
        projectId,
        absenceDate,
        status: {
          in: ["ACTIVE", "DRAFT"],
        },
      },
      select: {
        teacherId: true,
        absenceType: true,
        arrivalPeriodId: true,
        departurePeriodId: true,
        periodIdsJson: true,
      },
    }),

    prisma.timetableSubstitution.findMany({
      where: {
        projectId,
        substitutionDate: {
          gte: weekRange.start,
          lte: weekRange.end,
        },
        status: {
          in: [
            "ASSIGNED",
            "NOTIFIED",
            "COMPLETED",
            "REASSIGNED",
          ],
        },
        substituteTeacherId: {
          not: null,
        },
      },
      select: {
        substituteTeacherId: true,
        periodId: true,
        substitutionDate: true,
      },
    }),

    prisma.timetableSubstitution.findMany({
      where: {
        projectId,
        substitutionDate: {
          gte: dayRange.start,
          lte: dayRange.end,
        },
        status: {
          in: [
            "ASSIGNED",
            "NOTIFIED",
            "COMPLETED",
            "REASSIGNED",
          ],
        },
        substituteTeacherId: {
          not: null,
        },
      },
      select: {
        substituteTeacherId: true,
        periodId: true,
      },
    }),
  ]);

  const teacherLoads = new Map(
    project.teachers.map((teacher) => [
      teacher.id,
      teacher.assignments.reduce(
        (total, item) =>
          total + item.assignedLessons,
        0,
      ),
    ]),
  );

  const policySettings = normalizeRecord(
    policy.settingsJson,
  );

  const configuredReferenceLoad =
    readNumber(
      policySettings.referenceLoad,
    );

  const highestActualLoad = Math.max(
    0,
    ...Array.from(teacherLoads.values()),
  );

  const referenceLoad =
    configuredReferenceLoad &&
    configuredReferenceLoad > 0
      ? configuredReferenceLoad
      : highestActualLoad;

  const candidateCount = Math.min(
    10,
    Math.max(1, policy.candidateCount),
  );

  const substitutionRows: Array<
    Omit<
      Prisma.TimetableSubstitutionUncheckedCreateInput,
      "absenceId"
    >
  > = [];

  for (const session of absentSessions) {
    const result = rankCandidates({
      session,
      date: absenceDate,
      dayId: input.dayId,
      schedule,
      periods,
      teachers: project.teachers,
      teacherLoads,
      referenceLoad,
      policy,
      policySettings,
      activeAbsences,
      weeklySubstitutions,
      dailySubstitutions,
      supervisionDuties:
        project.supervisionDuties,
    });

    substitutionRows.push({
      schoolAccountId,
      projectId,
      substitutionDate: absenceDate,
      originalSessionId: session.id,
      dayId: session.dayId,
      periodId: session.periodId,
      classId: session.classId,
      className: session.className,
      subjectId: session.subjectId,
      subjectName: session.subjectName,
      originalTeacherId:
        session.teacherId,
      status:
        TimetableSubstitutionStatus.SUGGESTED,
      candidatesJson: {
        candidates: result.candidates.slice(
          0,
          candidateCount,
        ),
        excluded: result.excluded,
      } as Prisma.InputJsonValue,
      createdById,
    });
  }

  return prisma.$transaction(async (tx) => {
    const absence =
      await tx.timetableDailyAbsence.upsert({
        where: {
          projectId_teacherId_absenceDate: {
            projectId,
            teacherId: input.teacherId,
            absenceDate,
          },
        },
        update: {
          absenceType: input.absenceType,
          status: "ACTIVE",
          periodIdsJson:
            input.periodIds as Prisma.InputJsonValue,
          arrivalPeriodId:
            input.arrivalPeriodId || null,
          departurePeriodId:
            input.departurePeriodId || null,
          reason: input.reason || null,
          note: input.note || null,
          createdById,
        },
        create: {
          schoolAccountId,
          projectId,
          teacherId: input.teacherId,
          absenceDate,
          absenceType: input.absenceType,
          status: "ACTIVE",
          periodIdsJson:
            input.periodIds as Prisma.InputJsonValue,
          arrivalPeriodId:
            input.arrivalPeriodId || null,
          departurePeriodId:
            input.departurePeriodId || null,
          reason: input.reason || null,
          note: input.note || null,
          createdById,
        },
      });

    await tx.timetableSubstitution.deleteMany({
      where: {
        absenceId: absence.id,
        status: {
          in: ["PENDING", "SUGGESTED"],
        },
      },
    });

    for (const row of substitutionRows) {
      await tx.timetableSubstitution.upsert({
        where: {
          projectId_substitutionDate_originalSessionId:
            {
              projectId,
              substitutionDate: absenceDate,
              originalSessionId:
                row.originalSessionId,
            },
        },
        update: {
          absenceId: absence.id,
          candidatesJson:
            row.candidatesJson,
          status: "SUGGESTED",
          substituteTeacherId: null,
          candidateRank: null,
          candidateScore: null,
          selectionReason: null,
          overrideReason: null,
          updatedById: createdById,
        },
        create: {
          ...row,
          absenceId: absence.id,
        },
      });
    }

    return tx.timetableDailyAbsence.findUnique({
      where: {
        id: absence.id,
      },
      include: {
        teacher: true,
        substitutions: true,
      },
    });
  });
}

export async function assignSubstitute(
  projectId: string,
  schoolAccountId: string,
  updatedById: string,
  input: AssignSubstituteInput,
) {
  const substitution =
    await prisma.timetableSubstitution.findFirst({
      where: {
        id: input.substitutionId,
        projectId,
        schoolAccountId,
      },
      include: {
        absence: true,
      },
    });

  if (!substitution) {
    throw new Error("SUBSTITUTION_NOT_FOUND");
  }

  const teacher =
    await prisma.timetableTeacher.findFirst({
      where: {
        id: input.substituteTeacherId,
        projectId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
    });

  if (!teacher) {
    throw new Error("TEACHER_NOT_FOUND");
  }

  const project =
    await prisma.timetableProject.findFirst({
      where: {
        id: projectId,
        schoolAccountId,
      },
      select: {
        settingsJson: true,
      },
    });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  const schedule =
    await loadPublishedSchedule(
      projectId,
      schoolAccountId,
    );

  const busy = schedule.some(
    (session) =>
      session.teacherId === teacher.id &&
      session.dayId ===
        substitution.dayId &&
      session.periodId ===
        substitution.periodId,
  );

  if (busy) {
    throw new Error("TEACHER_BUSY");
  }

  const conflictingSubstitution =
    await prisma.timetableSubstitution.findFirst({
      where: {
        projectId,
        substitutionDate:
          substitution.substitutionDate,
        periodId: substitution.periodId,
        substituteTeacherId: teacher.id,
        status: {
          in: [
            "ASSIGNED",
            "NOTIFIED",
            "COMPLETED",
            "REASSIGNED",
          ],
        },
        id: {
          not: substitution.id,
        },
      },
      select: {
        id: true,
      },
    });

  if (conflictingSubstitution) {
    throw new Error(
      "TEACHER_ALREADY_ASSIGNED",
    );
  }

  const candidates = readCandidates(
    substitution.candidatesJson,
  );

  const selected = candidates.find(
    (candidate) =>
      candidate.teacherId === teacher.id,
  );

  return prisma.timetableSubstitution.update({
    where: {
      id: substitution.id,
    },
    data: {
      substituteTeacherId: teacher.id,
      status: "ASSIGNED",
      candidateRank:
        selected?.rank || null,
      candidateScore:
        selected?.score || null,
      selectionReason:
        selected?.reasonLabels.join("، ") ||
        "اختيار يدوي من مدير المدرسة",
      overrideReason:
        input.overrideReason || null,
      assignedAt: new Date(),
      updatedById,
    },
  });
}

export async function updateSubstitutionStatus(
  projectId: string,
  schoolAccountId: string,
  updatedById: string,
  input: UpdateSubstitutionInput,
) {
  const substitution =
    await prisma.timetableSubstitution.findFirst({
      where: {
        id: input.substitutionId,
        projectId,
        schoolAccountId,
      },
      select: {
        id: true,
      },
    });

  if (!substitution) {
    throw new Error("SUBSTITUTION_NOT_FOUND");
  }

  const now = new Date();

  return prisma.timetableSubstitution.update({
    where: {
      id: substitution.id,
    },
    data: {
      status: input.status,
      updatedById,
      overrideReason:
        input.note || undefined,
      notifiedAt:
        input.status === "NOTIFIED"
          ? now
          : undefined,
      completedAt:
        input.status === "COMPLETED"
          ? now
          : undefined,
      declinedAt:
        input.status === "DECLINED"
          ? now
          : undefined,
      canceledAt:
        input.status === "CANCELED"
          ? now
          : undefined,
    },
  });
}

export async function createSupervisionDuty(
  projectId: string,
  schoolAccountId: string,
  createdById: string,
  input: SupervisionDutyInput,
) {
  const project =
    await prisma.timetableProject.findFirst({
      where: {
        id: projectId,
        schoolAccountId,
      },
      select: {
        id: true,
        settingsJson: true,
      },
    });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  const validTeachers =
    await prisma.timetableTeacher.findMany({
      where: {
        projectId,
        id: {
          in: input.teacherIds,
        },
        isActive: true,
      },
      select: {
        id: true,
      },
    });

  if (
    validTeachers.length !==
    new Set(input.teacherIds).size
  ) {
    throw new Error("INVALID_TEACHERS");
  }

  if (input.periodId) {
    const schedule = normalizeSchedule(
      normalizeRecord(project.settingsJson)
        .generatedSchedule,
    );

    for (const teacher of validTeachers) {
      const conflict = schedule.some(
        (session) =>
          session.teacherId === teacher.id &&
          session.dayId === input.dayId &&
          session.periodId === input.periodId,
      );

      if (conflict) {
        throw new Error(
          "SUPERVISION_SCHEDULE_CONFLICT",
        );
      }
    }
  }

  return prisma.timetableSupervisionDuty.create({
    data: {
      schoolAccountId,
      projectId,
      title: input.title,
      dutyType: input.dutyType,
      status: input.teacherIds.length
        ? "ASSIGNED"
        : "DRAFT",
      dayId: input.dayId,
      periodId: input.periodId || null,
      startTime: input.startTime || null,
      endTime: input.endTime || null,
      location: input.location || null,
      requiredTeachers:
        input.requiredTeachers,
      note: input.note || null,
      createdById,
      assignments: {
        create: input.teacherIds.map(
          (teacherId, index) => ({
            teacherId,
            isPrimary:
              index <
              input.requiredTeachers,
            sortOrder: index,
          }),
        ),
      },
    },
    include: {
      assignments: {
        include: {
          teacher: true,
        },
      },
    },
  });
}

export async function updateSupervisionDuty(
  projectId: string,
  schoolAccountId: string,
  dutyId: string,
  input: SupervisionDutyInput,
) {
  const [project, duty, validTeachers] = await Promise.all([
    prisma.timetableProject.findFirst({
      where: { id: projectId, schoolAccountId },
      select: { id: true, settingsJson: true },
    }),
    prisma.timetableSupervisionDuty.findFirst({
      where: { id: dutyId, projectId, schoolAccountId },
      select: { id: true },
    }),
    prisma.timetableTeacher.findMany({
      where: { projectId, id: { in: input.teacherIds }, isActive: true },
      select: { id: true },
    }),
  ]);
  if (!project) throw new Error("PROJECT_NOT_FOUND");
  if (!duty) throw new Error("SUPERVISION_NOT_FOUND");
  if (validTeachers.length !== new Set(input.teacherIds).size) {
    throw new Error("INVALID_TEACHERS");
  }

  if (input.periodId) {
    const schedule = normalizeSchedule(normalizeRecord(project.settingsJson).generatedSchedule);
    const hasConflict = validTeachers.some((teacher) =>
      schedule.some(
        (session) =>
          session.teacherId === teacher.id &&
          session.dayId === input.dayId &&
          session.periodId === input.periodId,
      ),
    );
    if (hasConflict) throw new Error("SUPERVISION_SCHEDULE_CONFLICT");
  }

  return prisma.$transaction(async (tx) => {
    await tx.timetableSupervisionAssignment.deleteMany({ where: { dutyId: duty.id } });
    return tx.timetableSupervisionDuty.update({
      where: { id: duty.id },
      data: {
        title: input.title,
        dutyType: input.dutyType,
        status: input.teacherIds.length ? "ASSIGNED" : "DRAFT",
        dayId: input.dayId,
        periodId: input.periodId || null,
        startTime: input.startTime || null,
        endTime: input.endTime || null,
        location: input.location || null,
        requiredTeachers: input.requiredTeachers,
        note: input.note || null,
        assignments: {
          create: input.teacherIds.map((teacherId, index) => ({
            teacherId,
            isPrimary: index < input.requiredTeachers,
            sortOrder: index,
          })),
        },
      },
      include: { assignments: { include: { teacher: true } } },
    });
  });
}

export async function deleteDailyAbsence(
  projectId: string,
  schoolAccountId: string,
  absenceId: string,
) {
  const absence =
    await prisma.timetableDailyAbsence.findFirst({
      where: {
        id: absenceId,
        projectId,
        schoolAccountId,
      },
      select: {
        id: true,
      },
    });

  if (!absence) {
    return false;
  }

  await prisma.timetableDailyAbsence.delete({
    where: {
      id: absence.id,
    },
  });

  return true;
}

export async function deleteSupervisionDuty(
  projectId: string,
  schoolAccountId: string,
  dutyId: string,
) {
  const duty =
    await prisma.timetableSupervisionDuty.findFirst({
      where: {
        id: dutyId,
        projectId,
        schoolAccountId,
      },
      select: {
        id: true,
      },
    });

  if (!duty) {
    return false;
  }

  await prisma.timetableSupervisionDuty.delete({
    where: {
      id: duty.id,
    },
  });

  return true;
}

function rankCandidates(input: {
  session: ScheduleSession;
  date: Date;
  dayId: string;
  schedule: ScheduleSession[];
  periods: TimetablePeriod[];
  teachers: Array<{
    id: string;
    name: string;
    specialty: string | null;
    isActive: boolean;
    unavailableSlotsJson: unknown;
  }>;
  teacherLoads: Map<string, number>;
  referenceLoad: number;
  policy: {
    candidateCount: number;
    maxDailySubstitutions: number;
    maxWeeklySubstitutions: number;
    allowBeforeFirstLesson: boolean;
    allowAfterLastLesson: boolean;
    allowInsideGap: boolean;
    preferInsideGap: boolean;
    allowOnGoldenDay: boolean;
    goldenDayEmergency: boolean;
    preventConsecutiveSubstitutions: boolean;
    preventFirstPeriod: boolean;
    preventLastPeriod: boolean;
    requireMatchingSpecialty: boolean;
    preferMatchingSpecialty: boolean;
    weeklyLoadWeight: number;
    weeklyWaitingWeight: number;
    dailyWaitingWeight: number;
    gapPreferenceWeight: number;
    specialtyWeight: number;
    firstLastFairnessWeight: number;
  };
  policySettings: JsonRecord;
  activeAbsences: Array<{
    teacherId: string;
    absenceType: string;
    arrivalPeriodId: string | null;
    departurePeriodId: string | null;
    periodIdsJson: unknown;
  }>;
  weeklySubstitutions: Array<{
    substituteTeacherId: string | null;
    periodId: string;
    substitutionDate: Date;
  }>;
  dailySubstitutions: Array<{
    substituteTeacherId: string | null;
    periodId: string;
  }>;
  supervisionDuties: Array<{
    dayId: string;
    periodId: string | null;
    assignments: Array<{
      teacherId: string;
    }>;
  }>;
}) {
  const candidates: CandidateSnapshot[] = [];
  const excluded: ExcludedTeacherSnapshot[] =
    [];

  const periodIndex = new Map(
    input.periods.map((period, index) => [
      period.id,
      index,
    ]),
  );

  const targetIndex =
    periodIndex.get(input.session.periodId) ?? -1;

  const subjectTeacherSpecialty =
    input.teachers.find(
      (teacher) =>
        teacher.id ===
        input.session.teacherId,
    )?.specialty || null;

  for (const teacher of input.teachers) {
    const exclusionCodes: ExclusionCode[] =
      [];

    if (
      teacher.id ===
      input.session.teacherId
    ) {
      exclusionCodes.push(
        "ORIGINAL_TEACHER",
      );
    }

    if (!teacher.isActive) {
      exclusionCodes.push(
        "INACTIVE_TEACHER",
      );
    }

    const teacherDaySessions =
      input.schedule.filter(
        (session) =>
          session.teacherId === teacher.id &&
          session.dayId === input.dayId,
      );

    const busyInPeriod =
      teacherDaySessions.some(
        (session) =>
          session.periodId ===
          input.session.periodId,
      );

    if (busyInPeriod) {
      exclusionCodes.push(
        "BUSY_IN_PERIOD",
      );
    }

    const teacherAbsence =
      input.activeAbsences.find(
        (absence) =>
          absence.teacherId === teacher.id,
      );

    if (
      teacherAbsence &&
      isTeacherAbsentInPeriod(
        teacherAbsence,
        input.session.periodId,
        targetIndex,
        periodIndex,
      )
    ) {
      exclusionCodes.push(
        "ABSENT_ON_DATE",
      );
    }

    const weeklyExecuted =
      input.weeklySubstitutions.filter(
        (item) =>
          item.substituteTeacherId ===
          teacher.id,
      ).length;

    const dailyExecuted =
      input.dailySubstitutions.filter(
        (item) =>
          item.substituteTeacherId ===
          teacher.id,
      ).length;

    const alreadyAssigned =
      input.dailySubstitutions.some(
        (item) =>
          item.substituteTeacherId ===
            teacher.id &&
          item.periodId ===
            input.session.periodId,
      );

    if (alreadyAssigned) {
      exclusionCodes.push(
        "ALREADY_ASSIGNED_IN_PERIOD",
      );
    }

    if (
      dailyExecuted >=
      input.policy.maxDailySubstitutions
    ) {
      exclusionCodes.push(
        "DAILY_LIMIT_REACHED",
      );
    }

    if (
      weeklyExecuted >=
      input.policy.maxWeeklySubstitutions
    ) {
      exclusionCodes.push(
        "WEEKLY_LIMIT_REACHED",
      );
    }

    const teacherIndexes =
      teacherDaySessions
        .map((session) =>
          periodIndex.get(
            session.periodId,
          ),
        )
        .filter(
          (value): value is number =>
            value !== undefined,
        )
        .sort((a, b) => a - b);

    const firstIndex =
      teacherIndexes[0];

    const lastIndex =
      teacherIndexes[
        teacherIndexes.length - 1
      ];

    const beforeFirst =
      firstIndex !== undefined &&
      targetIndex < firstIndex;

    const afterLast =
      lastIndex !== undefined &&
      targetIndex > lastIndex;

    const insideGap =
      firstIndex !== undefined &&
      lastIndex !== undefined &&
      targetIndex > firstIndex &&
      targetIndex < lastIndex;

    if (
      beforeFirst &&
      !input.policy.allowBeforeFirstLesson
    ) {
      exclusionCodes.push(
        "BEFORE_FIRST_LESSON",
      );
    }

    if (
      afterLast &&
      !input.policy.allowAfterLastLesson
    ) {
      exclusionCodes.push(
        "AFTER_LAST_LESSON",
      );
    }

    if (
      insideGap &&
      !input.policy.allowInsideGap
    ) {
      exclusionCodes.push(
        "INSIDE_GAP_NOT_ALLOWED",
      );
    }

    if (
      input.policy.preventFirstPeriod &&
      targetIndex === 0
    ) {
      exclusionCodes.push(
        "FIRST_PERIOD_DISABLED",
      );
    }

    if (
      input.policy.preventLastPeriod &&
      targetIndex ===
        input.periods.length - 1
    ) {
      exclusionCodes.push(
        "LAST_PERIOD_DISABLED",
      );
    }

    if (
      input.policy
        .preventConsecutiveSubstitutions
    ) {
      const adjacent = input.dailySubstitutions.some(
        (item) => {
          if (
            item.substituteTeacherId !==
            teacher.id
          ) {
            return false;
          }

          const index =
            periodIndex.get(item.periodId);

          return (
            index !== undefined &&
            Math.abs(index - targetIndex) === 1
          );
        },
      );

      if (adjacent) {
        exclusionCodes.push(
          "CONSECUTIVE_WAITING",
        );
      }
    }

    const goldenDays =
      readStringArrayMap(
        input.policySettings
          .goldenDaysByTeacher,
        teacher.id,
      );

    if (
      goldenDays.includes(input.dayId) &&
      !input.policy.allowOnGoldenDay
    ) {
      exclusionCodes.push("GOLDEN_DAY");
    }

    const excludedDays =
      readStringArrayMap(
        input.policySettings
          .excludedDaysByTeacher,
        teacher.id,
      );

    if (
      excludedDays.includes(input.dayId)
    ) {
      exclusionCodes.push(
        "EXCLUDED_DAY",
      );
    }

    const excludedPeriods =
      readStringArrayMap(
        input.policySettings
          .excludedPeriodsByTeacher,
        teacher.id,
      );

    if (
      excludedPeriods.includes(
        input.session.periodId,
      )
    ) {
      exclusionCodes.push(
        "EXCLUDED_PERIOD",
      );
    }

    const unavailableSlots =
      normalizeUnavailableSlots(
        teacher.unavailableSlotsJson,
      );

    if (
      unavailableSlots.some(
        (slot) =>
          slot.dayId === input.dayId &&
          slot.periodId ===
            input.session.periodId,
      )
    ) {
      exclusionCodes.push(
        "EXCLUDED_PERIOD",
      );
    }

    const supervisionConflict =
      input.supervisionDuties.some(
        (duty) =>
          duty.dayId === input.dayId &&
          duty.periodId ===
            input.session.periodId &&
          duty.assignments.some(
            (assignment) =>
              assignment.teacherId ===
              teacher.id,
          ),
      );

    if (supervisionConflict) {
      exclusionCodes.push(
        "SUPERVISION_CONFLICT",
      );
    }

    const specialtyMatches =
      Boolean(
        subjectTeacherSpecialty &&
          teacher.specialty &&
          normalizeText(
            subjectTeacherSpecialty,
          ) ===
            normalizeText(
              teacher.specialty,
            ),
      );

    if (
      input.policy.requireMatchingSpecialty &&
      !specialtyMatches
    ) {
      exclusionCodes.push(
        "SPECIALTY_MISMATCH",
      );
    }

    const uniqueExclusions =
      Array.from(
        new Set(exclusionCodes),
      );

    if (uniqueExclusions.length) {
      excluded.push({
        teacherId: teacher.id,
        teacherName: teacher.name,
        codes: uniqueExclusions,
        reasons:
          uniqueExclusions.map(
            exclusionLabel,
          ),
      });

      continue;
    }

    const weeklyLoad =
      input.teacherLoads.get(teacher.id) ||
      0;

    const basicBalance = Math.max(
      0,
      input.referenceLoad - weeklyLoad,
    );

    const approvedBalance = Math.min(
      basicBalance,
      input.policy
        .maxWeeklySubstitutions,
    );

    const remainingBalance = Math.max(
      0,
      approvedBalance -
        weeklyExecuted,
    );

    const reasons: CandidateReasonCode[] =
      [];

    if (weeklyLoad < input.referenceLoad) {
      reasons.push("LOW_WEEKLY_LOAD");
    }

    if (remainingBalance > 0) {
      reasons.push(
        "HIGH_REMAINING_BALANCE",
      );
    }

    if (weeklyExecuted === 0) {
      reasons.push(
        "LOW_WEEKLY_WAITING",
      );
    }

    if (dailyExecuted === 0) {
      reasons.push("LOW_DAILY_WAITING");
    }

    if (insideGap) {
      reasons.push("INSIDE_GAP");
    }

    if (specialtyMatches) {
      reasons.push(
        "MATCHING_SPECIALTY",
      );
    }

    const manualPriority =
      readTeacherPriority(
        input.policySettings
          .priorityByTeacher,
        teacher.id,
      );

    if (manualPriority !== 0) {
      reasons.push("MANUAL_PRIORITY");
    }

    let score = 0;

    score +=
      remainingBalance *
      input.policy.weeklyLoadWeight;

    score -=
      weeklyExecuted *
      input.policy.weeklyWaitingWeight;

    score -=
      dailyExecuted *
      input.policy.dailyWaitingWeight;

    if (
      insideGap &&
      input.policy.preferInsideGap
    ) {
      score +=
        input.policy.gapPreferenceWeight;
    }

    if (
      specialtyMatches &&
      input.policy.preferMatchingSpecialty
    ) {
      score +=
        input.policy.specialtyWeight;
    }

    score += manualPriority * 10;

    candidates.push({
      teacherId: teacher.id,
      teacherName: teacher.name,
      specialty: teacher.specialty,
      weeklyLoad,
      referenceLoad: input.referenceLoad,
      basicBalance,
      weeklyExecuted,
      dailyExecuted,
      remainingBalance,
      score,
      rank: 0,
      reasons,
      reasonLabels: reasons.map(
        candidateReasonLabel,
      ),
    });
  }

  candidates.sort((first, second) => {
    if (
      first.score !== second.score
    ) {
      return second.score - first.score;
    }

    if (
      first.remainingBalance !==
      second.remainingBalance
    ) {
      return (
        second.remainingBalance -
        first.remainingBalance
      );
    }

    if (
      first.weeklyLoad !==
      second.weeklyLoad
    ) {
      return (
        first.weeklyLoad -
        second.weeklyLoad
      );
    }

    return first.teacherName.localeCompare(
      second.teacherName,
      "ar",
    );
  });

  candidates.forEach(
    (candidate, index) => {
      candidate.rank = index + 1;
    },
  );

  return {
    candidates,
    excluded,
  };
}

function isTeacherAbsentInPeriod(
  absence: {
    absenceType: string;
    arrivalPeriodId: string | null;
    departurePeriodId: string | null;
    periodIdsJson: unknown;
  },
  periodId: string,
  targetIndex: number,
  periodIndex: Map<string, number>,
) {
  if (absence.absenceType === "FULL_DAY") {
    return true;
  }

  if (
    absence.absenceType ===
    "SELECTED_PERIODS"
  ) {
    return normalizeStringArray(
      absence.periodIdsJson,
    ).includes(periodId);
  }

  if (
    absence.absenceType ===
      "LATE_ARRIVAL" &&
    absence.arrivalPeriodId
  ) {
    const arrivalIndex =
      periodIndex.get(
        absence.arrivalPeriodId,
      );

    return (
      arrivalIndex !== undefined &&
      targetIndex < arrivalIndex
    );
  }

  if (
    absence.absenceType ===
      "EARLY_DEPARTURE" &&
    absence.departurePeriodId
  ) {
    const departureIndex =
      periodIndex.get(
        absence.departurePeriodId,
      );

    return (
      departureIndex !== undefined &&
      targetIndex > departureIndex
    );
  }

  return false;
}

function readCandidates(
  value: unknown,
): CandidateSnapshot[] {
  const record = normalizeRecord(value);

  return Array.isArray(record.candidates)
    ? (record.candidates as CandidateSnapshot[])
    : [];
}

function candidateReasonLabel(
  code: CandidateReasonCode,
) {
  const labels: Record<
    CandidateReasonCode,
    string
  > = {
    LOW_WEEKLY_LOAD: "نصابه الأسبوعي أقل",
    HIGH_REMAINING_BALANCE:
      "لديه رصيد انتظار متبقٍ",
    LOW_WEEKLY_WAITING:
      "أقل تنفيذًا للانتظار أسبوعيًا",
    LOW_DAILY_WAITING:
      "أقل تنفيذًا للانتظار اليوم",
    INSIDE_GAP:
      "الحصة داخل فراغ في جدوله",
    MATCHING_SPECIALTY:
      "تخصصه مطابق أو قريب",
    MANUAL_PRIORITY:
      "له أولوية يحددها المدير",
  };

  return labels[code];
}

function exclusionLabel(
  code: ExclusionCode,
) {
  const labels: Record<
    ExclusionCode,
    string
  > = {
    ORIGINAL_TEACHER:
      "هو المعلم الغائب نفسه",
    INACTIVE_TEACHER:
      "المعلم غير فعال",
    BUSY_IN_PERIOD:
      "لديه حصة في الوقت نفسه",
    ABSENT_ON_DATE:
      "مسجل غائبًا في هذا الوقت",
    ALREADY_ASSIGNED_IN_PERIOD:
      "مسند له انتظار آخر في الحصة نفسها",
    DAILY_LIMIT_REACHED:
      "بلغ الحد اليومي للانتظار",
    WEEKLY_LIMIT_REACHED:
      "بلغ الحد الأسبوعي للانتظار",
    BEFORE_FIRST_LESSON:
      "الانتظار قبل بداية دوامه",
    AFTER_LAST_LESSON:
      "الانتظار بعد نهاية دوامه",
    INSIDE_GAP_NOT_ALLOWED:
      "الانتظار داخل الفراغ غير مسموح",
    GOLDEN_DAY:
      "هذا يومه الذهبي",
    EXCLUDED_DAY:
      "اليوم مستبعد لهذا المعلم",
    EXCLUDED_PERIOD:
      "الحصة مستبعدة لهذا المعلم",
    CONSECUTIVE_WAITING:
      "سيؤدي إلى انتظارين متتاليين",
    FIRST_PERIOD_DISABLED:
      "الانتظار في الحصة الأولى ممنوع",
    LAST_PERIOD_DISABLED:
      "الانتظار في الحصة الأخيرة ممنوع",
    SPECIALTY_MISMATCH:
      "التخصص غير مطابق",
    SUPERVISION_CONFLICT:
      "لديه مناوبة أو إشراف متعارض",
  };

  return labels[code];
}

function normalizeRecord(
  value: unknown,
): JsonRecord {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as JsonRecord;
}

function normalizeSchedule(
  value: unknown,
): ScheduleSession[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is ScheduleSession =>
      Boolean(
        item &&
          typeof item === "object" &&
          "id" in item &&
          "teacherId" in item &&
          "classId" in item &&
          "subjectId" in item &&
          "dayId" in item &&
          "periodId" in item,
      ),
  );
}

function normalizeDays(
  value: unknown,
): TimetableDay[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((item, index) => {
      if (
        !item ||
        typeof item !== "object"
      ) {
        return [];
      }

      const record =
        item as JsonRecord;

      const id = String(record.id || "");
      const label = String(
        record.label || "",
      );

      if (!id || !label) {
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
              : index,
        },
      ];
    })
    .sort(
      (first, second) =>
        first.order - second.order,
    );
}

function normalizePeriods(
  value: unknown,
): TimetablePeriod[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((item, index) => {
      if (
        !item ||
        typeof item !== "object"
      ) {
        return [];
      }

      const record =
        item as JsonRecord;

      const id = String(record.id || "");
      const label = String(
        record.label || "",
      );

      if (!id || !label) {
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
              : index,
          isBreak:
            record.isBreak === true,
        },
      ];
    })
    .sort(
      (first, second) =>
        first.order - second.order,
    );
}

function normalizeUnavailableSlots(
  value: unknown,
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (
      !item ||
      typeof item !== "object"
    ) {
      return [];
    }

    const record =
      item as JsonRecord;

    const dayId = String(
      record.dayId || "",
    );

    const periodId = String(
      record.periodId || "",
    );

    return dayId && periodId
      ? [
          {
            dayId,
            periodId,
          },
        ]
      : [];
  });
}

function normalizeStringArray(
  value: unknown,
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item))
    .filter(Boolean);
}

function readStringArrayMap(
  value: unknown,
  key: string,
) {
  const record = normalizeRecord(value);

  return normalizeStringArray(record[key]);
}

function readTeacherPriority(
  value: unknown,
  key: string,
) {
  const record = normalizeRecord(value);
  const priority = record[key];

  return typeof priority === "number"
    ? priority
    : 0;
}

function readNumber(
  value: unknown,
) {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : null;
}

function normalizeText(
  value: string,
) {
  return value
    .trim()
    .toLocaleLowerCase("ar")
    .replace(/\s+/g, " ");
}

function parseDateOnly(
  value: string,
) {
  const [year, month, day] = value
    .split("-")
    .map(Number);

  return new Date(
    Date.UTC(year, month - 1, day),
  );
}

function getDayRange(date: Date) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);

  return {
    start,
    end,
  };
}

function getWeekRange(date: Date) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);

  const day = start.getUTCDay();

  start.setUTCDate(
    start.getUTCDate() - day,
  );

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);

  return {
    start,
    end,
  };
}
