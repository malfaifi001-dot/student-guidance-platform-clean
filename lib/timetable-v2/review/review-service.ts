import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type TimetableReviewEntry = {
  id: string;
  assignmentId: string | null;

  teacherId: string;
  teacherName: string;

  classId: string;
  className: string;

  subjectId: string;
  subjectName: string;

  dayId: string;
  dayLabel: string;

  periodId: string;
  periodLabel: string;
  periodOrder: number;

  isLocked: boolean;
  source: string;
  placementScore: number;
};

export type TimetableReviewWorkspace = {
  project: {
    id: string;
    name: string;
    status: string;
    days: Array<{
      id: string;
      label: string;
      order: number;
    }>;
    periods: Array<{
      id: string;
      label: string;
      order: number;
      isBreak: boolean;
    }>;
  };

  schedule: {
    id: string;
    version: number;
    status: string;
    score: number;
    completeness: number;
    hardViolations: number;
    softPenalty: number;
    engineVersion: string;
  };

  versions: Array<{
    id: string;
    version: number;
    status: string;
    isCurrent: boolean;
    score: number;
    generatedAt: Date;
  }>;

  classes: Array<{
    id: string;
    name: string;
  }>;

  entries: TimetableReviewEntry[];
};

type JsonDay = {
  id?: unknown;
  label?: unknown;
  order?: unknown;
};

type JsonPeriod = {
  id?: unknown;
  label?: unknown;
  order?: unknown;
  isBreak?: unknown;
};

function normalizeDays(
  value: Prisma.JsonValue,
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      const row =
        item &&
        typeof item === "object" &&
        !Array.isArray(item)
          ? (item as JsonDay)
          : {};

      const id =
        typeof row.id === "string"
          ? row.id
          : "";

      if (!id) {
        return null;
      }

      return {
        id,

        label:
          typeof row.label === "string"
            ? row.label
            : id,

        order:
          typeof row.order === "number"
            ? row.order
            : index,
      };
    })
    .filter(
      (
        item,
      ): item is {
        id: string;
        label: string;
        order: number;
      } =>
        item !== null,
    )
    .sort(
      (a, b) =>
        a.order - b.order,
    );
}

function normalizePeriods(
  value: Prisma.JsonValue,
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => {
      const row =
        item &&
        typeof item === "object" &&
        !Array.isArray(item)
          ? (item as JsonPeriod)
          : {};

      const id =
        typeof row.id === "string"
          ? row.id
          : "";

      if (!id) {
        return null;
      }

      return {
        id,

        label:
          typeof row.label === "string"
            ? row.label
            : id,

        order:
          typeof row.order === "number"
            ? row.order
            : index,

        isBreak:
          row.isBreak === true,
      };
    })
    .filter(
      (
        item,
      ): item is {
        id: string;
        label: string;
        order: number;
        isBreak: boolean;
      } =>
        item !== null,
    )
    .sort(
      (a, b) =>
        a.order - b.order,
    );
}

async function requireOwnedProject(
  projectId: string,
  schoolAccountId: string,
) {
  const project =
    await prisma.timetableProject.findFirst({
      where: {
        id: projectId,
        schoolAccountId,
      },

      select: {
        id: true,
        name: true,
        status: true,
        daysJson: true,
        periodsJson: true,
      },
    });

  if (!project) {
    throw new Error(
      "TIMETABLE_PROJECT_NOT_FOUND",
    );
  }

  return project;
}

async function getScheduleForReview(
  projectId: string,
  scheduleId?: string,
) {
  const schedule =
    scheduleId
      ? await prisma.timetableSchedule.findFirst({
          where: {
            id: scheduleId,
            projectId,
          },

          include: {
            entries: {
              orderBy: [
                {
                  className:
                    "asc",
                },
                {
                  dayId:
                    "asc",
                },
                {
                  periodOrder:
                    "asc",
                },
              ],
            },
          },
        })
      : await prisma.timetableSchedule.findFirst({
          where: {
            projectId,
            isCurrent: true,
          },

          include: {
            entries: {
              orderBy: [
                {
                  className:
                    "asc",
                },
                {
                  dayId:
                    "asc",
                },
                {
                  periodOrder:
                    "asc",
                },
              ],
            },
          },

          orderBy: {
            version:
              "desc",
          },
        });

  if (!schedule) {
    throw new Error(
      "TIMETABLE_SCHEDULE_NOT_FOUND",
    );
  }

  return schedule;
}

export async function getTimetableReviewWorkspace(
  projectId: string,
  schoolAccountId: string,
  scheduleId?: string,
): Promise<TimetableReviewWorkspace> {
  const [
    project,
    schedule,
    versions,
    classes,
  ] =
    await Promise.all([
      requireOwnedProject(
        projectId,
        schoolAccountId,
      ),

      getScheduleForReview(
        projectId,
        scheduleId,
      ),

      prisma.timetableSchedule.findMany({
        where: {
          projectId,
        },

        select: {
          id: true,
          version: true,
          status: true,
          isCurrent: true,
          score: true,
          generatedAt: true,
        },

        orderBy: {
          version:
            "desc",
        },
      }),

      prisma.timetableClass.findMany({
        where: {
          projectId,
          isActive: true,
        },

        select: {
          id: true,
          name: true,
        },

        orderBy: {
          name:
            "asc",
        },
      }),
    ]);

  return {
    project: {
      id:
        project.id,

      name:
        project.name,

      status:
        project.status,

      days:
        normalizeDays(
          project.daysJson,
        ),

      periods:
        normalizePeriods(
          project.periodsJson,
        ),
    },

    schedule: {
      id:
        schedule.id,

      version:
        schedule.version,

      status:
        schedule.status,

      score:
        schedule.score,

      completeness:
        schedule.completeness,

      hardViolations:
        schedule.hardViolations,

      softPenalty:
        schedule.softPenalty,

      engineVersion:
        schedule.engineVersion,
    },

    versions,

    classes,

    entries:
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

          source:
            entry.source,

          placementScore:
            entry.placementScore,
        }),
      ),
  };
}

export type ReviewEdit =
  | {
      type: "MOVE";
      entryId: string;
      dayId: string;
      periodId: string;
    }
  | {
      type: "SWAP";
      firstEntryId: string;
      secondEntryId: string;
    }
  | {
      type: "LOCK";
      entryId: string;
      isLocked: boolean;
    };

type MutableEntry =
  TimetableReviewEntry;

function entrySlotKey(
  dayId: string,
  periodId: string,
) {
  return `${dayId}:${periodId}`;
}

function ensureNoCollisions(
  entries: MutableEntry[],
) {
  const classSlots =
    new Map<
      string,
      string
    >();

  const teacherSlots =
    new Map<
      string,
      string
    >();

  for (
    const entry of
    entries
  ) {
    const slot =
      entrySlotKey(
        entry.dayId,
        entry.periodId,
      );

    const classKey =
      `${entry.classId}:${slot}`;

    const teacherKey =
      `${entry.teacherId}:${slot}`;

    const existingClass =
      classSlots.get(
        classKey,
      );

    if (
      existingClass
    ) {
      throw new Error(
        "REVIEW_CLASS_COLLISION",
      );
    }

    classSlots.set(
      classKey,
      entry.id,
    );

    const existingTeacher =
      teacherSlots.get(
        teacherKey,
      );

    if (
      existingTeacher
    ) {
      throw new Error(
        "REVIEW_TEACHER_COLLISION",
      );
    }

    teacherSlots.set(
      teacherKey,
      entry.id,
    );
  }
}

function applyEdit(
  entries:
    MutableEntry[],
  edit:
    ReviewEdit,
  days:
    TimetableReviewWorkspace["project"]["days"],
  periods:
    TimetableReviewWorkspace["project"]["periods"],
) {
  const byId =
    new Map(
      entries.map(
        (entry) => [
          entry.id,
          entry,
        ],
      ),
    );

  if (
    edit.type ===
    "LOCK"
  ) {
    const entry =
      byId.get(
        edit.entryId,
      );

    if (!entry) {
      throw new Error(
        "REVIEW_ENTRY_NOT_FOUND",
      );
    }

    entry.isLocked =
      edit.isLocked;

    return;
  }

  if (
    edit.type ===
    "MOVE"
  ) {
    const entry =
      byId.get(
        edit.entryId,
      );

    if (!entry) {
      throw new Error(
        "REVIEW_ENTRY_NOT_FOUND",
      );
    }

    if (
      entry.isLocked
    ) {
      throw new Error(
        "REVIEW_ENTRY_LOCKED",
      );
    }

    const day =
      days.find(
        (item) =>
          item.id ===
          edit.dayId,
      );

    const period =
      periods.find(
        (item) =>
          item.id ===
          edit.periodId &&
          !item.isBreak,
      );

    if (
      !day ||
      !period
    ) {
      throw new Error(
        "REVIEW_INVALID_SLOT",
      );
    }

    entry.dayId =
      day.id;

    entry.dayLabel =
      day.label;

    entry.periodId =
      period.id;

    entry.periodLabel =
      period.label;

    entry.periodOrder =
      period.order;

    entry.source =
      "MANUAL_MOVE";

    return;
  }

  const first =
    byId.get(
      edit.firstEntryId,
    );

  const second =
    byId.get(
      edit.secondEntryId,
    );

  if (
    !first ||
    !second
  ) {
    throw new Error(
      "REVIEW_ENTRY_NOT_FOUND",
    );
  }

  if (
    first.isLocked ||
    second.isLocked
  ) {
    throw new Error(
      "REVIEW_ENTRY_LOCKED",
    );
  }

  const firstSlot = {
    dayId:
      first.dayId,

    dayLabel:
      first.dayLabel,

    periodId:
      first.periodId,

    periodLabel:
      first.periodLabel,

    periodOrder:
      first.periodOrder,
  };

  first.dayId =
    second.dayId;

  first.dayLabel =
    second.dayLabel;

  first.periodId =
    second.periodId;

  first.periodLabel =
    second.periodLabel;

  first.periodOrder =
    second.periodOrder;

  first.source =
    "MANUAL_SWAP";

  second.dayId =
    firstSlot.dayId;

  second.dayLabel =
    firstSlot.dayLabel;

  second.periodId =
    firstSlot.periodId;

  second.periodLabel =
    firstSlot.periodLabel;

  second.periodOrder =
    firstSlot.periodOrder;

  second.source =
    "MANUAL_SWAP";
}

export async function saveTimetableReviewVersion(
  projectId: string,
  schoolAccountId: string,
  userId: string,
  input: {
    baseScheduleId: string;
    edits: ReviewEdit[];
  },
) {
  const project =
    await requireOwnedProject(
      projectId,
      schoolAccountId,
    );

  const base =
    await getScheduleForReview(
      projectId,
      input.baseScheduleId,
    );

  if (
    base.status ===
      "PUBLISHED"
  ) {
    throw new Error(
      "REVIEW_PUBLISHED_SCHEDULE_IMMUTABLE",
    );
  }

  const days =
    normalizeDays(
      project.daysJson,
    );

  const periods =
    normalizePeriods(
      project.periodsJson,
    );

  const entries:
    MutableEntry[] =
      base.entries.map(
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

          source:
            entry.source,

          placementScore:
            entry.placementScore,
        }),
      );

  for (
    const edit of
    input.edits
  ) {
    applyEdit(
      entries,
      edit,
      days,
      periods,
    );

    ensureNoCollisions(
      entries,
    );
  }

  ensureNoCollisions(
    entries,
  );

  const nextVersion =
    await prisma.$transaction(
      async (tx) => {
        const latest =
          await tx.timetableSchedule.findFirst({
            where: {
              projectId,
            },

            select: {
              version:
                true,
            },

            orderBy: {
              version:
                "desc",
            },
          });

        const version =
          (
            latest?.version ??
            0
          ) + 1;

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

        const created =
          await tx.timetableSchedule.create({
            data: {
              projectId,

              version,

              status:
                "GENERATED",

              isCurrent:
                true,

              score:
                base.score,

              completeness:
                base.completeness,

              hardViolations:
                0,

              softPenalty:
                base.softPenalty,

              attemptCount:
                base.attemptCount,

              seed:
                base.seed,

              durationMs:
                0,

              engineVersion:
                `${base.engineVersion}+manual-review`,

              dataFingerprint:
                base.dataFingerprint,

              diagnosticsJson: {
                source:
                  "MANUAL_REVIEW",

                baseScheduleId:
                  base.id,

                baseVersion:
                  base.version,

                editCount:
                  input.edits.length,
              },

              configJson: {
                source:
                  "MANUAL_REVIEW",

                baseScheduleId:
                  base.id,

                edits:
                  input.edits,
              },

              createdById:
                userId,

              entries: {
                create:
                  entries.map(
                    (entry) => ({
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

                      source:
                        entry.source,

                      placementScore:
                        entry.placementScore,

                      metadataJson:
                        Prisma.JsonNull,
                    })),
              },
            },

            select: {
              id: true,
              version: true,
            },
          });

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

        return created;
      },
    );

  return nextVersion;
}