import "server-only";

import {
  prisma,
} from "@/lib/prisma";

function normalizeArray(
  value: unknown,
) {
  return Array.isArray(value)
    ? value
    : [];
}

export async function getTimetableV2ProjectList(
  schoolAccountId: string,
) {
  const projects =
    await prisma.timetableProject.findMany({
      where: {
        schoolAccountId,
      },

      orderBy: {
        updatedAt:
          "desc",
      },

      include: {
        teachers: {
          where: {
            isActive:
              true,
          },

          select: {
            id: true,
          },
        },

        classes: {
          where: {
            isActive:
              true,
          },

          select: {
            id: true,
          },
        },

        subjects: {
          where: {
            isActive:
              true,
          },

          select: {
            id: true,
          },
        },

        classSubjects: {
          select: {
            id: true,
            weeklyLessons: true,
          },
        },

        assignments: {
          select: {
            assignedLessons:
              true,
          },
        },

        constraints: {
          select: {
            id: true,
            isActive: true,
            strength: true,
          },
        },

        schedules: {
          orderBy: {
            version:
              "desc",
          },

          take: 1,

          select: {
            id: true,
            version: true,
            status: true,
            score: true,
            completeness: true,
            isCurrent: true,
            generatedAt: true,
          },
        },
      },
    });

  return projects.map(
    (project) => {
      const days =
        normalizeArray(
          project.daysJson,
        );

      const periods =
        normalizeArray(
          project.periodsJson,
        ).filter(
          (period) =>
            Boolean(
              period &&
              typeof period ===
                "object" &&
              !(
                "isBreak" in
                period
              ) ||
              !(
                period as {
                  isBreak?: boolean;
                }
              ).isBreak,
            ),
        );

      const requiredLessons =
        project.classSubjects.reduce(
          (sum, item) =>
            sum +
            item.weeklyLessons,
          0,
        );

      const assignedLessons =
        project.assignments.reduce(
          (sum, item) =>
            sum +
            item.assignedLessons,
          0,
        );

      const activeConstraints =
        project.constraints.filter(
          (item) =>
            item.isActive,
        );

      const hardConstraints =
        activeConstraints.filter(
          (item) =>
            item.strength ===
            "HARD",
        );

      const softConstraints =
        activeConstraints.filter(
          (item) =>
            item.strength ===
            "SOFT",
        );

      const latestSchedule =
        project.schedules[0] ??
        null;

      const assignmentComplete =
        requiredLessons > 0 &&
        assignedLessons ===
          requiredLessons;

      let progress = 0;

      if (
        project.classes.length >
        0
      ) {
        progress += 15;
      }

      if (
        project.subjects.length >
        0
      ) {
        progress += 15;
      }

      if (
        project.teachers.length >
        0
      ) {
        progress += 15;
      }

      if (
        requiredLessons >
        0
      ) {
        progress += 15;
      }

      if (
        assignmentComplete
      ) {
        progress += 20;
      }

      if (
        days.length > 0 &&
        periods.length > 0
      ) {
        progress += 10;
      }

      if (
        latestSchedule
      ) {
        progress += 10;
      }

      progress =
        Math.min(
          100,
          progress,
        );

      return {
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

        createdAt:
          project.createdAt,

        updatedAt:
          project.updatedAt,

        teacherCount:
          project.teachers.length,

        classCount:
          project.classes.length,

        subjectCount:
          project.subjects.length,

        requiredLessons,

        assignedLessons,

        activeConstraintCount:
          activeConstraints.length,

        hardConstraintCount:
          hardConstraints.length,

        softConstraintCount:
          softConstraints.length,

        dayCount:
          days.length,

        periodCount:
          periods.length,

        progress,

        assignmentComplete,

        latestSchedule,
      };
    },
  );
}