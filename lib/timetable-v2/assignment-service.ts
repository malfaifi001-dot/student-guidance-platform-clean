import "server-only";

import {
  prisma,
} from "@/lib/prisma";

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

export async function getTimetableV2AssignmentsWorkspace(
  projectId: string,
  schoolAccountId: string,
) {
  const project =
    await requireOwnedProject(
      projectId,
      schoolAccountId,
    );

  const [
    teachers,
    classSubjects,
    assignments,
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

    prisma.timetableClassSubject.findMany({
      where: {
        projectId,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        weeklyLessons: true,
        classId: true,
        subjectId: true,

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

    prisma.timetableAssignment.findMany({
      where: {
        projectId,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        teacherId: true,
        classId: true,
        subjectId: true,
        assignedLessons: true,
        singlePeriods: true,
        doublePeriods: true,
      },
    }),
  ]);

  return {
    project,
    teachers,
    classSubjects,
    assignments,
  };
}

export type TimetableV2AssignmentShareInput = {
  teacherId: string;
  assignedLessons: number;
};

export async function saveTimetableV2SharedAssignments(
  projectId: string,
  schoolAccountId: string,
  input: {
    classSubjectId: string;
    shares: TimetableV2AssignmentShareInput[];
  },
) {
  await requireOwnedProject(
    projectId,
    schoolAccountId,
  );

  const classSubject =
    await prisma.timetableClassSubject.findFirst({
      where: {
        id: input.classSubjectId,
        projectId,
      },
      select: {
        id: true,
        classId: true,
        subjectId: true,
        weeklyLessons: true,
      },
    });

  if (!classSubject) {
    throw new Error(
      "CLASS_SUBJECT_NOT_FOUND",
    );
  }

  const shares =
    input.shares
      .filter(
        (share) =>
          share.assignedLessons > 0,
      )
      .map((share) => ({
        teacherId:
          share.teacherId,
        assignedLessons:
          share.assignedLessons,
      }));

  const teacherIds =
    shares.map(
      (share) =>
        share.teacherId,
    );

  if (
    new Set(
      teacherIds,
    ).size !==
    teacherIds.length
  ) {
    throw new Error(
      "DUPLICATE_TEACHER_SHARE",
    );
  }

  for (
    const share of shares
  ) {
    if (
      !Number.isInteger(
        share.assignedLessons,
      ) ||
      share.assignedLessons < 1 ||
      share.assignedLessons >
        classSubject.weeklyLessons
    ) {
      throw new Error(
        "INVALID_ASSIGNED_LESSONS",
      );
    }
  }

  const totalAssigned =
    shares.reduce(
      (sum, share) =>
        sum +
        share.assignedLessons,
      0,
    );

  if (
    totalAssigned >
    classSubject.weeklyLessons
  ) {
    throw new Error(
      "ASSIGNMENT_TOTAL_OVERFLOW",
    );
  }

  if (
    teacherIds.length > 0
  ) {
    const teachers =
      await prisma.timetableTeacher.findMany({
        where: {
          projectId,
          isActive: true,
          id: {
            in: teacherIds,
          },
        },
        select: {
          id: true,
        },
      });

    if (
      teachers.length !==
      teacherIds.length
    ) {
      throw new Error(
        "TEACHER_NOT_FOUND",
      );
    }
  }

  return prisma.$transaction(
    async (tx) => {
      await tx.timetableAssignment.deleteMany({
        where: {
          projectId,
          classId:
            classSubject.classId,
          subjectId:
            classSubject.subjectId,
        },
      });

      if (
        shares.length > 0
      ) {
        await tx.timetableAssignment.createMany({
          data:
            shares.map(
              (share) => ({
                projectId,

                teacherId:
                  share.teacherId,

                classId:
                  classSubject.classId,

                subjectId:
                  classSubject.subjectId,

                assignedLessons:
                  share.assignedLessons,

                singlePeriods: 0,
                doublePeriods: 0,
              }),
            ),
        });
      }

      const assignments =
        await tx.timetableAssignment.findMany({
          where: {
            projectId,
            classId:
              classSubject.classId,
            subjectId:
              classSubject.subjectId,
          },
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            teacherId: true,
            classId: true,
            subjectId: true,
            assignedLessons: true,
            singlePeriods: true,
            doublePeriods: true,
          },
        });

      return {
        assignments,
        totalAssigned,
        weeklyLessons:
          classSubject.weeklyLessons,
        remainingLessons:
          classSubject.weeklyLessons -
          totalAssigned,
      };
    },
  );
}