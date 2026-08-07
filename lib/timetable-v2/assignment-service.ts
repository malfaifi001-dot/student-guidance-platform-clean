import "server-only";

import {
  Prisma,
} from "@prisma/client";

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

function hasValidPeriodComposition(
  assignedLessons: number,
  singlePeriods: number,
  doublePeriods: number,
) {
  if (
    !Number.isInteger(
      assignedLessons,
    ) ||
    !Number.isInteger(
      singlePeriods,
    ) ||
    !Number.isInteger(
      doublePeriods,
    )
  ) {
    return false;
  }

  if (
    assignedLessons < 0 ||
    singlePeriods < 0 ||
    doublePeriods < 0
  ) {
    return false;
  }

  return (
    singlePeriods +
      doublePeriods * 2 ===
    assignedLessons
  );
}

function defaultPeriodComposition(
  assignedLessons: number,
) {
  return {
    singlePeriods:
      assignedLessons,

    doublePeriods:
      0,
  };
}

export async function saveTimetableV2SharedAssignments(
  projectId: string,
  schoolAccountId: string,
  input: {
    classSubjectId: string;
    shares:
      TimetableV2AssignmentShareInput[];
  },
) {
  await requireOwnedProject(
    projectId,
    schoolAccountId,
  );

  const classSubject =
    await prisma.timetableClassSubject.findFirst({
      where: {
        id:
          input.classSubjectId,

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
          share.assignedLessons >
          0,
      )
      .map(
        (share) => ({
          teacherId:
            share.teacherId,

          assignedLessons:
            share.assignedLessons,
        }),
      );

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
    const share of
    shares
  ) {
    if (
      !Number.isInteger(
        share.assignedLessons,
      ) ||
      share.assignedLessons <
        1 ||
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
    teacherIds.length >
    0
  ) {
    const teachers =
      await prisma.timetableTeacher.findMany({
        where: {
          projectId,

          isActive:
            true,

          id: {
            in:
              teacherIds,
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
      const existing =
        await tx.timetableAssignment.findMany({
          where: {
            projectId,

            classId:
              classSubject.classId,

            subjectId:
              classSubject.subjectId,
          },

          select: {
            id: true,
            teacherId: true,

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

      const existingByTeacher =
        new Map(
          existing.map(
            (assignment) => [
              assignment.teacherId,
              assignment,
            ],
          ),
        );

      const incomingTeacherIds =
        new Set(
          teacherIds,
        );

      const removedIds =
        existing
          .filter(
            (assignment) =>
              !incomingTeacherIds.has(
                assignment.teacherId,
              ),
          )
          .map(
            (assignment) =>
              assignment.id,
          );

      if (
        removedIds.length >
        0
      ) {
        await tx.timetableAssignment.deleteMany({
          where: {
            id: {
              in:
                removedIds,
            },
          },
        });
      }

      for (
        const share of
        shares
      ) {
        const current =
          existingByTeacher.get(
            share.teacherId,
          );

        if (!current) {
          const composition =
            defaultPeriodComposition(
              share.assignedLessons,
            );

          await tx.timetableAssignment.create({
            data: {
              projectId,

              teacherId:
                share.teacherId,

              classId:
                classSubject.classId,

              subjectId:
                classSubject.subjectId,

              assignedLessons:
                share.assignedLessons,

              singlePeriods:
                composition.singlePeriods,

              doublePeriods:
                composition.doublePeriods,

              fixedSlotsJson:
                Prisma.JsonNull,
            },
          });

          continue;
        }

        const sameLessonCount =
          current.assignedLessons ===
          share.assignedLessons;

        const currentCompositionValid =
          hasValidPeriodComposition(
            current.assignedLessons,
            current.singlePeriods,
            current.doublePeriods,
          );

        if (
          sameLessonCount &&
          currentCompositionValid
        ) {
          /*
           * لا نلمس تركيب الحصص ولا التثبيتات.
           * نفس المعلم ونفس عدد الحصص، لذلك الإعداد الحالي
           * ما زال صالحًا.
           */
          continue;
        }

        const composition =
          defaultPeriodComposition(
            share.assignedLessons,
          );

        await tx.timetableAssignment.update({
          where: {
            id:
              current.id,
          },

          data: {
            assignedLessons:
              share.assignedLessons,

            singlePeriods:
              composition.singlePeriods,

            doublePeriods:
              composition.doublePeriods,

            /*
             * عدد الحصص تغير أو التركيب القديم غير صالح.
             * أي تثبيت قديم قد يشير إلى Blocks لم تعد موجودة،
             * لذلك نمسحه بدل الاحتفاظ ببيانات غير متناسقة.
             */
            fixedSlotsJson:
              Prisma.JsonNull,
          },
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
            createdAt:
              "asc",
          },

          select: {
            id: true,
            teacherId: true,
            classId: true,
            subjectId: true,

            assignedLessons:
              true,

            singlePeriods:
              true,

            doublePeriods:
              true,
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