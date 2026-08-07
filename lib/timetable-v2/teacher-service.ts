import "server-only";

import {
  prisma,
} from "@/lib/prisma";

export type TimetableV2TeacherUpdateInput = {
  name: string;
  specialty?: string | null;
  maxWeeklyLoad: number;
  isActive: boolean;
};

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
        academicYear: true,
        semester: true,
        status: true,
      },
    });

  if (!project) {
    throw new Error(
      "PROJECT_NOT_FOUND",
    );
  }

  return project;
}

function normalizeName(
  value: string,
) {
  return value
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeOptional(
  value?: string | null,
) {
  const clean =
    value
      ?.trim()
      .replace(/\s+/g, " ") ??
    "";

  return clean || null;
}

export async function getTimetableV2TeachersWorkspace(
  projectId: string,
  schoolAccountId: string,
) {
  const project =
    await requireOwnedProject(
      projectId,
      schoolAccountId,
    );

  const teachers =
    await prisma.timetableTeacher.findMany({
      where: {
        projectId,
      },
      orderBy: [
        {
          isActive: "desc",
        },
        {
          createdAt: "asc",
        },
      ],
      select: {
        id: true,
        name: true,
        specialty: true,
        maxWeeklyLoad: true,
        isActive: true,
        userId: true,
        createdAt: true,

        _count: {
          select: {
            assignments: true,
            dailyAbsences: true,
            originalSubstitutions: true,
            assignedSubstitutions: true,
            supervisionAssignments: true,
          },
        },
      },
    });

  return {
    project,
    teachers,
  };
}

export async function createTimetableV2Teacher(
  projectId: string,
  schoolAccountId: string,
  input: TimetableV2TeacherUpdateInput,
) {
  await requireOwnedProject(
    projectId,
    schoolAccountId,
  );

  const name =
    normalizeName(input.name);

  if (!name) {
    throw new Error(
      "TEACHER_NAME_REQUIRED",
    );
  }

  if (
    !Number.isInteger(
      input.maxWeeklyLoad,
    ) ||
    input.maxWeeklyLoad < 1 ||
    input.maxWeeklyLoad > 60
  ) {
    throw new Error(
      "INVALID_MAX_WEEKLY_LOAD",
    );
  }

  return prisma.timetableTeacher.create({
    data: {
      projectId,
      name,
      specialty:
        normalizeOptional(
          input.specialty,
        ),
      maxWeeklyLoad:
        input.maxWeeklyLoad,
      isActive:
        input.isActive,
    },
    select: {
      id: true,
      name: true,
      specialty: true,
      maxWeeklyLoad: true,
      isActive: true,
      userId: true,
      createdAt: true,

      _count: {
        select: {
          assignments: true,
          dailyAbsences: true,
          originalSubstitutions: true,
          assignedSubstitutions: true,
          supervisionAssignments: true,
        },
      },
    },
  });
}

export async function updateTimetableV2Teacher(
  projectId: string,
  teacherId: string,
  schoolAccountId: string,
  input: TimetableV2TeacherUpdateInput,
) {
  await requireOwnedProject(
    projectId,
    schoolAccountId,
  );

  const existing =
    await prisma.timetableTeacher.findFirst({
      where: {
        id: teacherId,
        projectId,
      },
      select: {
        id: true,
      },
    });

  if (!existing) {
    throw new Error(
      "TEACHER_NOT_FOUND",
    );
  }

  const name =
    normalizeName(input.name);

  if (!name) {
    throw new Error(
      "TEACHER_NAME_REQUIRED",
    );
  }

  if (
    !Number.isInteger(
      input.maxWeeklyLoad,
    ) ||
    input.maxWeeklyLoad < 1 ||
    input.maxWeeklyLoad > 60
  ) {
    throw new Error(
      "INVALID_MAX_WEEKLY_LOAD",
    );
  }

  return prisma.timetableTeacher.update({
    where: {
      id: teacherId,
    },
    data: {
      name,
      specialty:
        normalizeOptional(
          input.specialty,
        ),
      maxWeeklyLoad:
        input.maxWeeklyLoad,
      isActive:
        input.isActive,
    },
    select: {
      id: true,
      name: true,
      specialty: true,
      maxWeeklyLoad: true,
      isActive: true,
      userId: true,
      createdAt: true,

      _count: {
        select: {
          assignments: true,
          dailyAbsences: true,
          originalSubstitutions: true,
          assignedSubstitutions: true,
          supervisionAssignments: true,
        },
      },
    },
  });
}

export async function deleteTimetableV2Teacher(
  projectId: string,
  teacherId: string,
  schoolAccountId: string,
) {
  await requireOwnedProject(
    projectId,
    schoolAccountId,
  );

  const teacher =
    await prisma.timetableTeacher.findFirst({
      where: {
        id: teacherId,
        projectId,
      },
      select: {
        id: true,
        name: true,

        _count: {
          select: {
            assignments: true,
            dailyAbsences: true,
            originalSubstitutions: true,
            assignedSubstitutions: true,
            supervisionAssignments: true,
          },
        },
      },
    });

  if (!teacher) {
    throw new Error(
      "TEACHER_NOT_FOUND",
    );
  }

  const linkedCount =
    teacher._count.assignments +
    teacher._count.dailyAbsences +
    teacher._count.originalSubstitutions +
    teacher._count.assignedSubstitutions +
    teacher._count.supervisionAssignments;

  if (linkedCount > 0) {
    throw new Error(
      "TEACHER_HAS_LINKED_DATA",
    );
  }

  await prisma.timetableTeacher.delete({
    where: {
      id: teacher.id,
    },
  });

  return {
    id: teacher.id,
    name: teacher.name,
  };
}