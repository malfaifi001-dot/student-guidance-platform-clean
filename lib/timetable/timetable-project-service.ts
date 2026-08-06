import "server-only";

import { prisma } from "@/lib/prisma";
import type { TimetableProjectInput } from "@/lib/timetable/timetable-schemas";

export async function listTimetableProjects(schoolAccountId: string) {
  return prisma.timetableProject.findMany({
    where: { schoolAccountId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createTimetableProject(
  schoolAccountId: string,
  createdById: string,
  input: TimetableProjectInput,
) {
  return prisma.timetableProject.create({
    data: {
      schoolAccountId,
      createdById,
      name: input.name,
      academicYear: input.academicYear,
      semester: input.semester,
      daysJson: input.days,
      periodsJson: input.periods,
      settingsJson: input.settings,
    },
  });
}