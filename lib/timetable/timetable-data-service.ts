import "server-only";

import { prisma } from "@/lib/prisma";
import type {
  TimetableAssignmentInput,
  TimetableClassInput,
  TimetableClassSubjectInput,
  TimetableSubjectInput,
  TimetableTeacherInput,
} from "@/lib/timetable/timetable-schemas";

export const timetableResourceNames = [
  "teachers",
  "classes",
  "subjects",
  "class-subjects",
  "assignments",
] as const;

export type TimetableResourceName =
  (typeof timetableResourceNames)[number];

export function isTimetableResourceName(
  value: string,
): value is TimetableResourceName {
  return timetableResourceNames.includes(
    value as TimetableResourceName,
  );
}

export async function findScopedProject(
  projectId: string,
  schoolAccountId: string,
) {
  return prisma.timetableProject.findFirst({
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
      settingsJson: true,
    },
  });
}

export async function getTimetableProjectData(
  projectId: string,
  schoolAccountId: string,
) {
  const project = await prisma.timetableProject.findFirst({
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
          createdAt: "asc",
        },
      },
      classSubjects: {
        include: {
          class: true,
          subject: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      assignments: {
        include: {
          teacher: true,
          class: true,
          subject: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  return project;
}

export async function createTimetableTeacher(
  projectId: string,
  schoolAccountId: string,
  input: TimetableTeacherInput,
) {
  await assertScopedProject(projectId, schoolAccountId);

  return prisma.timetableTeacher.create({
    data: {
      projectId,
      userId: input.userId || null,
      name: input.name,
      specialty: input.specialty || null,
      maxWeeklyLoad: input.maxWeeklyLoad,
      isActive: input.isActive,
      unavailableSlotsJson: input.unavailableSlots,
    },
  });
}

export async function createTimetableClass(
  projectId: string,
  schoolAccountId: string,
  input: TimetableClassInput,
) {
  await assertScopedProject(projectId, schoolAccountId);

  return prisma.timetableClass.create({
    data: {
      projectId,
      name: input.name,
      isActive: input.isActive,
    },
  });
}

export async function createTimetableSubject(
  projectId: string,
  schoolAccountId: string,
  input: TimetableSubjectInput,
) {
  await assertScopedProject(projectId, schoolAccountId);

  return prisma.timetableSubject.create({
    data: {
      projectId,
      name: input.name,
      catalogKey: input.catalogKey || null,
      isActive: input.isActive,
    },
  });
}

export async function createTimetableClassSubject(
  projectId: string,
  schoolAccountId: string,
  input: TimetableClassSubjectInput,
) {
  await assertScopedProject(projectId, schoolAccountId);

  const [classItem, subject] = await Promise.all([
    prisma.timetableClass.findFirst({
      where: {
        id: input.classId,
        projectId,
      },
      select: {
        id: true,
      },
    }),
    prisma.timetableSubject.findFirst({
      where: {
        id: input.subjectId,
        projectId,
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (!classItem || !subject) {
    throw new Error("PROJECT_RESOURCE_MISMATCH");
  }

  return prisma.timetableClassSubject.create({
    data: {
      projectId,
      classId: input.classId,
      subjectId: input.subjectId,
      weeklyLessons: input.weeklyLessons,
    },
    include: {
      class: true,
      subject: true,
    },
  });
}

export async function createTimetableAssignment(
  projectId: string,
  schoolAccountId: string,
  input: TimetableAssignmentInput,
) {
  await assertScopedProject(projectId, schoolAccountId);

  const [teacher, classItem, subject, classSubject] =
    await Promise.all([
      prisma.timetableTeacher.findFirst({
        where: {
          id: input.teacherId,
          projectId,
        },
        select: {
          id: true,
        },
      }),
      prisma.timetableClass.findFirst({
        where: {
          id: input.classId,
          projectId,
        },
        select: {
          id: true,
        },
      }),
      prisma.timetableSubject.findFirst({
        where: {
          id: input.subjectId,
          projectId,
        },
        select: {
          id: true,
        },
      }),
      prisma.timetableClassSubject.findFirst({
        where: {
          projectId,
          classId: input.classId,
          subjectId: input.subjectId,
        },
        select: {
          id: true,
          weeklyLessons: true,
        },
      }),
    ]);

  if (!teacher || !classItem || !subject || !classSubject) {
    throw new Error("PROJECT_RESOURCE_MISMATCH");
  }

  if (input.assignedLessons > classSubject.weeklyLessons) {
    throw new Error("ASSIGNED_LESSONS_OVERFLOW");
  }

  return prisma.timetableAssignment.create({
    data: {
      projectId,
      teacherId: input.teacherId,
      classId: input.classId,
      subjectId: input.subjectId,
      assignedLessons: input.assignedLessons,
      singlePeriods: input.singlePeriods,
      doublePeriods: input.doublePeriods,
      fixedSlotsJson: input.fixedSlots,
    },
    include: {
      teacher: true,
      class: true,
      subject: true,
    },
  });
}

export async function deleteTimetableResource(
  projectId: string,
  schoolAccountId: string,
  resource: TimetableResourceName,
  id: string,
) {
  await assertScopedProject(projectId, schoolAccountId);

  if (resource === "teachers") {
    return prisma.timetableTeacher.deleteMany({
      where: {
        id,
        projectId,
      },
    });
  }

  if (resource === "classes") {
    return prisma.timetableClass.deleteMany({
      where: {
        id,
        projectId,
      },
    });
  }

  if (resource === "subjects") {
    return prisma.timetableSubject.deleteMany({
      where: {
        id,
        projectId,
      },
    });
  }

  if (resource === "class-subjects") {
    return prisma.timetableClassSubject.deleteMany({
      where: {
        id,
        projectId,
      },
    });
  }

  return prisma.timetableAssignment.deleteMany({
    where: {
      id,
      projectId,
    },
  });
}

async function assertScopedProject(
  projectId: string,
  schoolAccountId: string,
) {
  const project = await prisma.timetableProject.findFirst({
    where: {
      id: projectId,
      schoolAccountId,
    },
    select: {
      id: true,
    },
  });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }
}
export async function updateTeacherUnavailableSlots(
  projectId: string,
  schoolAccountId: string,
  teacherId: string,
  unavailableSlots: Array<{
    dayId: string;
    periodId: string;
  }>,
) {
  const project = await prisma.timetableProject.findFirst({
    where: {
      id: projectId,
      schoolAccountId,
    },
    select: {
      id: true,
      daysJson: true,
      periodsJson: true,
    },
  });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  const teacher = await prisma.timetableTeacher.findFirst({
    where: {
      id: teacherId,
      projectId,
    },
    select: {
      id: true,
    },
  });

  if (!teacher) {
    throw new Error("TEACHER_NOT_FOUND");
  }

  const days = Array.isArray(project.daysJson)
    ? (project.daysJson as Array<{ id?: unknown }>)
    : [];

  const periods = Array.isArray(project.periodsJson)
    ? (project.periodsJson as Array<{
        id?: unknown;
        isBreak?: unknown;
      }>)
    : [];

  const validDayIds = new Set(
    days
      .map((day) =>
        typeof day.id === "string" ? day.id : "",
      )
      .filter(Boolean),
  );

  const validPeriodIds = new Set(
    periods
      .filter((period) => period.isBreak !== true)
      .map((period) =>
        typeof period.id === "string" ? period.id : "",
      )
      .filter(Boolean),
  );

  const uniqueSlots = new Map<
    string,
    {
      dayId: string;
      periodId: string;
    }
  >();

  for (const slot of unavailableSlots) {
    if (
      !validDayIds.has(slot.dayId) ||
      !validPeriodIds.has(slot.periodId)
    ) {
      throw new Error("INVALID_SLOT");
    }

    uniqueSlots.set(
      `${slot.dayId}:${slot.periodId}`,
      slot,
    );
  }

  return prisma.timetableTeacher.update({
    where: {
      id: teacherId,
    },
    data: {
      unavailableSlotsJson: Array.from(
        uniqueSlots.values(),
      ),
    },
  });
}
