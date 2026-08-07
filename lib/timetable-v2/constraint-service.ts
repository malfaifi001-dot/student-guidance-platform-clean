import "server-only";

import {
  Prisma,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

export type TimetableV2SlotInput = {
  dayId: string;
  periodId: string;
};

export type TimetableV2ConstraintInput = {
  type: string;
  strength: "HARD" | "SOFT";
  title?: string | null;
  valueInt?: number | null;
  notes?: string | null;
  isActive?: boolean;

  teacherIds?: string[];
  subjectIds?: string[];
  classIds?: string[];
  dayIds?: string[];
  periodIds?: string[];
  slots?: TimetableV2SlotInput[];

  configJson?: Prisma.InputJsonValue | null;
};

function normalizeText(
  value?: string | null,
) {
  const clean =
    value
      ?.trim()
      .replace(/\s+/g, " ") ??
    "";

  return clean || null;
}

async function requireProject(
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
        academicYear: true,
        semester: true,
        status: true,
        daysJson: true,
        periodsJson: true,
      },
    });

  if (!project) {
    throw new Error(
      "PROJECT_NOT_FOUND",
    );
  }

  return project;
}

function unique(
  values: string[] = [],
) {
  return [
    ...new Set(
      values.filter(Boolean),
    ),
  ];
}

function uniqueSlots(
  slots: TimetableV2SlotInput[] = [],
) {
  const map =
    new Map<
      string,
      TimetableV2SlotInput
    >();

  for (
    const slot of slots
  ) {
    if (
      !slot.dayId ||
      !slot.periodId
    ) {
      continue;
    }

    map.set(
      `${slot.dayId}:${slot.periodId}`,
      slot,
    );
  }

  return [
    ...map.values(),
  ];
}

async function validateTargets(
  projectId: string,
  input: TimetableV2ConstraintInput,
) {
  const teacherIds =
    unique(
      input.teacherIds,
    );

  const subjectIds =
    unique(
      input.subjectIds,
    );

  const classIds =
    unique(
      input.classIds,
    );

  const [
    teacherCount,
    subjectCount,
    classCount,
  ] = await Promise.all([
    teacherIds.length
      ? prisma.timetableTeacher.count({
          where: {
            projectId,
            id: {
              in: teacherIds,
            },
          },
        })
      : 0,

    subjectIds.length
      ? prisma.timetableSubject.count({
          where: {
            projectId,
            id: {
              in: subjectIds,
            },
          },
        })
      : 0,

    classIds.length
      ? prisma.timetableClass.count({
          where: {
            projectId,
            id: {
              in: classIds,
            },
          },
        })
      : 0,
  ]);

  if (
    teacherCount !==
    teacherIds.length
  ) {
    throw new Error(
      "INVALID_TEACHER_TARGET",
    );
  }

  if (
    subjectCount !==
    subjectIds.length
  ) {
    throw new Error(
      "INVALID_SUBJECT_TARGET",
    );
  }

  if (
    classCount !==
    classIds.length
  ) {
    throw new Error(
      "INVALID_CLASS_TARGET",
    );
  }

  return {
    teacherIds,
    subjectIds,
    classIds,
    dayIds:
      unique(input.dayIds),
    periodIds:
      unique(
        input.periodIds,
      ),
    slots:
      uniqueSlots(
        input.slots,
      ),
  };
}

const constraintInclude = {
  teachers: {
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

  subjects: {
    include: {
      subject: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },

  classes: {
    include: {
      class: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },

  days: true,
  periods: true,
  slots: true,
} satisfies Prisma.TimetableConstraintInclude;

export async function getTimetableV2ConstraintsWorkspace(
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
    subjects,
    classes,
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

    prisma.timetableConstraint.findMany({
      where: {
        projectId,
      },
      orderBy: [
        {
          isActive: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      include:
        constraintInclude,
    }),
  ]);

  return {
    project,
    teachers,
    subjects,
    classes,
    constraints,
  };
}

export async function createTimetableV2Constraint(
  projectId: string,
  schoolAccountId: string,
  input: TimetableV2ConstraintInput,
) {
  await requireProject(
    projectId,
    schoolAccountId,
  );

  const targets =
    await validateTargets(
      projectId,
      input,
    );

  if (
    !input.type?.trim()
  ) {
    throw new Error(
      "CONSTRAINT_TYPE_REQUIRED",
    );
  }

  return prisma.timetableConstraint.create({
    data: {
      projectId,
      type:
        input.type.trim(),
      strength:
        input.strength,
      title:
        normalizeText(
          input.title,
        ),
      valueInt:
        input.valueInt ??
        null,
      notes:
        normalizeText(
          input.notes,
        ),
      isActive:
        input.isActive ??
        true,
      configJson:
        input.configJson ??
        undefined,

      teachers: {
        create:
          targets.teacherIds.map(
            (teacherId) => ({
              teacherId,
            }),
          ),
      },

      subjects: {
        create:
          targets.subjectIds.map(
            (subjectId) => ({
              subjectId,
            }),
          ),
      },

      classes: {
        create:
          targets.classIds.map(
            (classId) => ({
              classId,
            }),
          ),
      },

      days: {
        create:
          targets.dayIds.map(
            (dayId) => ({
              dayId,
            }),
          ),
      },

      periods: {
        create:
          targets.periodIds.map(
            (periodId) => ({
              periodId,
            }),
          ),
      },

      slots: {
        create:
          targets.slots.map(
            (slot) => ({
              dayId:
                slot.dayId,
              periodId:
                slot.periodId,
            }),
          ),
      },
    },
    include:
      constraintInclude,
  });
}

export async function deleteTimetableV2Constraint(
  projectId: string,
  constraintId: string,
  schoolAccountId: string,
) {
  await requireProject(
    projectId,
    schoolAccountId,
  );

  const existing =
    await prisma.timetableConstraint.findFirst({
      where: {
        id: constraintId,
        projectId,
      },
      select: {
        id: true,
      },
    });

  if (!existing) {
    throw new Error(
      "CONSTRAINT_NOT_FOUND",
    );
  }

  await prisma.timetableConstraint.delete({
    where: {
      id: constraintId,
    },
  });
}

export async function saveTimetableV2Periods(
  projectId: string,
  schoolAccountId: string,
  periods: Prisma.InputJsonValue,
) {
  await requireProject(
    projectId,
    schoolAccountId,
  );

  return prisma.timetableProject.update({
    where: {
      id: projectId,
    },
    data: {
      periodsJson:
        periods,
    },
    select: {
      id: true,
      periodsJson: true,
    },
  });
}