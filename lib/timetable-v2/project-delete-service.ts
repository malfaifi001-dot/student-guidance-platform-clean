import "server-only";

import {
  prisma,
} from "@/lib/prisma";

export async function deleteTimetableV2Project(
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

        _count: {
          select: {
            teachers: true,
            classes: true,
            subjects: true,
            classSubjects: true,
            assignments: true,
            constraints: true,
            schedules: true,
            dailyAbsences: true,
            substitutions: true,
            supervisionDuties: true,
          },
        },
      },
    });

  if (!project) {
    throw new Error(
      "PROJECT_NOT_FOUND",
    );
  }

  if (
    project.status ===
    "PUBLISHED"
  ) {
    throw new Error(
      "PUBLISHED_PROJECT_CANNOT_BE_DELETED",
    );
  }

  await prisma.timetableProject.delete({
    where: {
      id:
        project.id,
    },
  });

  return {
    id:
      project.id,

    name:
      project.name,

    deletedCounts:
      project._count,
  };
}