import "server-only";

import {
  Prisma,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import type {
  TimetableHistoryDb,
} from "./history/timetable-history-service";

import {
  normalizeTimetableV3ClassMappings,
  normalizeTimetableV3Stages,
} from "./project-setup-service";

function asObject(
  value: unknown,
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as Record<string, unknown>;
}

function isTimetableV3Project(
  settingsJson: unknown,
) {
  const settings =
    asObject(
      settingsJson,
    );

  const v3 =
    asObject(
      settings.timetableV3,
    );

  return (
    v3.version ===
    3
  );
}

async function requireProject(
  db: TimetableHistoryDb,
  projectId: string,
  schoolAccountId: string,
) {
  const project =
    await db.timetableProject.findFirst({
      where: {
        id:
          projectId,

        schoolAccountId,
      },

      select: {
        id:
          true,

        name:
          true,

        academicYear:
          true,

        semester:
          true,

        settingsJson:
          true,
      },
    });

  if (
    !project ||
    !isTimetableV3Project(
      project.settingsJson,
    )
  ) {
    throw new Error(
      "PROJECT_NOT_FOUND",
    );
  }

  return project;
}

async function requireResources(
  db: TimetableHistoryDb,
  projectId: string,
  input: {
    teacherId: string;
    classId: string;
    subjectId: string;
  },
) {
  const [
    teacher,
    classItem,
    subject,
  ] = await Promise.all([
    db.timetableTeacher.findFirst({
      where: {
        id:
          input.teacherId,

        projectId,

        isActive:
          true,
      },

      select: {
        id:
          true,

        name:
          true,

        maxWeeklyLoad:
          true,
      },
    }),

    db.timetableClass.findFirst({
      where: {
        id:
          input.classId,

        projectId,

        isActive:
          true,
      },

      select: {
        id:
          true,

        name:
          true,
      },
    }),

    db.timetableSubject.findFirst({
      where: {
        id:
          input.subjectId,

        projectId,

        isActive:
          true,
      },

      select: {
        id:
          true,

        name:
          true,
      },
    }),
  ]);

  if (!teacher) {
    throw new Error(
      "TEACHER_NOT_FOUND",
    );
  }

  if (!classItem) {
    throw new Error(
      "CLASS_NOT_FOUND",
    );
  }

  if (!subject) {
    throw new Error(
      "SUBJECT_NOT_FOUND",
    );
  }

  return {
    teacher,
    classItem,
    subject,
  };
}

function validateLessons(
  assignedLessons: number,
) {
  if (
    !Number.isInteger(
      assignedLessons,
    ) ||
    assignedLessons <
      1 ||
    assignedLessons >
      60
  ) {
    throw new Error(
      "INVALID_ASSIGNED_LESSONS",
    );
  }
}

async function getTeacherCurrentLoad(
  db: TimetableHistoryDb,
  projectId: string,
  teacherId: string,
  excludeAssignmentId?: string,
) {
  const result =
    await db.timetableAssignment.aggregate({
      where: {
        projectId,

        teacherId,

        ...(excludeAssignmentId
          ? {
              id: {
                not:
                  excludeAssignmentId,
              },
            }
          : {}),
      },

      _sum: {
        assignedLessons:
          true,
      },
    });

  return (
    result._sum
      .assignedLessons ??
    0
  );
}

export async function getTimetableV3AssignmentsWorkspace(
  projectId: string,
  schoolAccountId: string,
) {
  const project =
    await requireProject(
      prisma,
      projectId,
      schoolAccountId,
    );

  const [
    teachers,
    classes,
    subjects,
    classSubjects,
    assignments,
  ] = await Promise.all([
    prisma.timetableTeacher.findMany({
      where: {
        projectId,
        isActive:
          true,
      },

      orderBy: {
        createdAt:
          "asc",
      },

      select: {
        id:
          true,

        name:
          true,

        specialty:
          true,

        maxWeeklyLoad:
          true,
      },
    }),

    prisma.timetableClass.findMany({
      where: {
        projectId,
        isActive:
          true,
      },

      orderBy: {
        createdAt:
          "asc",
      },

      select: {
        id:
          true,

        name:
          true,
      },
    }),

    prisma.timetableSubject.findMany({
      where: {
        projectId,
        isActive:
          true,
      },

      orderBy: {
        name:
          "asc",
      },

      select: {
        id:
          true,

        name:
          true,
      },
    }),

    prisma.timetableClassSubject.findMany({
      where: {
        projectId,
        class: {
          isActive: true,
        },
        subject: {
          isActive: true,
        },
      },
      select: {
        classId: true,
        subjectId: true,
        weeklyLessons: true,
      },
    }),

    prisma.timetableAssignment.findMany({
      where: {
        projectId,
      },

      orderBy: {
        createdAt:
          "asc",
      },

      select: {
        id:
          true,

        teacherId:
          true,

        classId:
          true,

        subjectId:
          true,

        assignedLessons:
          true,

        singlePeriods:
          true,

        doublePeriods:
          true,

        teacher: {
          select: {
            name:
              true,
          },
        },

        class: {
          select: {
            name:
              true,
          },
        },

        subject: {
          select: {
            name:
              true,
          },
        },
      },
    }),
  ]);

  const loadByTeacher =
    new Map<
      string,
      number
    >();

  for (
    const assignment of
    assignments
  ) {
    loadByTeacher.set(
      assignment.teacherId,
      (
        loadByTeacher.get(
          assignment.teacherId,
        ) ??
        0
      ) +
        assignment.assignedLessons,
    );
  }

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

      stages:
        normalizeTimetableV3Stages(
          project.settingsJson,
          classes.map((item) => item.name),
        ),
    },

    teachers:
      teachers.map(
        (teacher) => ({
          ...teacher,

          specialty:
            teacher.specialty ??
            "",

          assignedLoad:
            loadByTeacher.get(
              teacher.id,
            ) ??
            0,
        }),
      ),

    classes,

    classMappings:
      normalizeTimetableV3ClassMappings(
        project.settingsJson,
        classes,
      ),

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
        }),
      ),

    classSubjects,
  };
}

export async function createTimetableV3Assignment(
  projectId: string,
  schoolAccountId: string,
  input: {
    teacherId: string;
    classId: string;
    subjectId: string;
    assignedLessons: number;
    allowOverload?: boolean;
  },
  db: TimetableHistoryDb = prisma,
) {
  await requireProject(
    db,
    projectId,
    schoolAccountId,
  );

  validateLessons(
    input.assignedLessons,
  );

  const {
    teacher,
  } = await requireResources(
    db,
    projectId,
    input,
  );

  const duplicate =
    await db.timetableAssignment.findFirst({
      where: {
        projectId,

        teacherId:
          input.teacherId,

        classId:
          input.classId,

        subjectId:
          input.subjectId,
      },

      select: {
        id:
          true,
      },
    });

  if (duplicate) {
    throw new Error(
      "ASSIGNMENT_ALREADY_EXISTS",
    );
  }

  const currentLoad =
    await getTeacherCurrentLoad(
      db,
      projectId,
      input.teacherId,
    );

  const projectedLoad =
    currentLoad +
    input.assignedLessons;

  if (
    projectedLoad >
      teacher.maxWeeklyLoad &&
    !input.allowOverload
  ) {
    return {
      overload:
        true as const,

      teacher: {
        id:
          teacher.id,

        name:
          teacher.name,

        maxWeeklyLoad:
          teacher.maxWeeklyLoad,

        currentLoad,

        projectedLoad,
      },
    };
  }

  const assignment =
    await db.timetableAssignment.create({
      data: {
        projectId,

        teacherId:
          input.teacherId,

        classId:
          input.classId,

        subjectId:
          input.subjectId,

        assignedLessons:
          input.assignedLessons,

        singlePeriods:
          input.assignedLessons,

        doublePeriods:
          0,

        fixedSlotsJson:
          Prisma.JsonNull,
      },

      select: {
        id:
          true,
      },
    });

  return {
    overload:
      false as const,

    assignment,
  };
}

export async function updateTimetableV3Assignment(
  projectId: string,
  assignmentId: string,
  schoolAccountId: string,
  input: {
    teacherId: string;
    classId: string;
    subjectId: string;
    assignedLessons: number;
    allowOverload?: boolean;
  },
  db: TimetableHistoryDb = prisma,
) {
  await requireProject(
    db,
    projectId,
    schoolAccountId,
  );

  validateLessons(
    input.assignedLessons,
  );

  const current =
    await db.timetableAssignment.findFirst({
      where: {
        id:
          assignmentId,

        projectId,
      },

      select: {
        id:
          true,

        assignedLessons:
          true,

        singlePeriods:
          true,

        doublePeriods:
          true,

        fixedSlotsJson:
          true,
      },
    });

  if (!current) {
    throw new Error(
      "ASSIGNMENT_NOT_FOUND",
    );
  }

  const {
    teacher,
  } = await requireResources(
    db,
    projectId,
    input,
  );

  const duplicate =
    await db.timetableAssignment.findFirst({
      where: {
        projectId,

        teacherId:
          input.teacherId,

        classId:
          input.classId,

        subjectId:
          input.subjectId,

        id: {
          not:
            assignmentId,
        },
      },

      select: {
        id:
          true,
      },
    });

  if (duplicate) {
    throw new Error(
      "ASSIGNMENT_ALREADY_EXISTS",
    );
  }

  const currentLoad =
    await getTeacherCurrentLoad(
      db,
      projectId,
      input.teacherId,
      assignmentId,
    );

  const projectedLoad =
    currentLoad +
    input.assignedLessons;

  if (
    projectedLoad >
      teacher.maxWeeklyLoad &&
    !input.allowOverload
  ) {
    return {
      overload:
        true as const,

      teacher: {
        id:
          teacher.id,

        name:
          teacher.name,

        maxWeeklyLoad:
          teacher.maxWeeklyLoad,

        currentLoad,

        projectedLoad,
      },
    };
  }

  const sameLessonCount =
    current.assignedLessons ===
    input.assignedLessons;

  await db.timetableAssignment.update({
    where: {
      id:
        assignmentId,
    },

    data: {
      teacherId:
        input.teacherId,

      classId:
        input.classId,

      subjectId:
        input.subjectId,

      assignedLessons:
        input.assignedLessons,

      ...(sameLessonCount
        ? {}
        : {
            singlePeriods:
              input.assignedLessons,

            doublePeriods:
              0,

            fixedSlotsJson:
              Prisma.JsonNull,
          }),
    },
  });

  return {
    overload:
      false as const,
  };
}

export async function deleteTimetableV3Assignment(
  projectId: string,
  assignmentId: string,
  schoolAccountId: string,
  db: TimetableHistoryDb = prisma,
) {
  await requireProject(
    db,
    projectId,
    schoolAccountId,
  );

  const current =
    await db.timetableAssignment.findFirst({
      where: {
        id:
          assignmentId,

        projectId,
      },

      select: {
        id:
          true,
      },
    });

  if (!current) {
    throw new Error(
      "ASSIGNMENT_NOT_FOUND",
    );
  }

  await db.timetableAssignment.delete({
    where: {
      id:
        assignmentId,
    },
  });
}
