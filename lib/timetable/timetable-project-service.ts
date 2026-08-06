import "server-only";

import { prisma } from "@/lib/prisma";
import type {
  TimetableProjectInput,
  TimetableProjectMetadataInput,
} from "@/lib/timetable/timetable-schemas";

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

export async function updateTimetableProjectMetadata(
  projectId: string,
  schoolAccountId: string,
  input: TimetableProjectMetadataInput,
) {
  const project = await prisma.timetableProject.findFirst({
    where: { id: projectId, schoolAccountId },
    select: { id: true },
  });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  return prisma.timetableProject.update({
    where: { id: project.id },
    data: {
      name: input.name,
      academicYear: input.academicYear,
      semester: input.semester,
    },
  });
}

export async function deleteTimetableProject(
  projectId: string,
  schoolAccountId: string,
  confirmedName: string,
) {
  const project = await prisma.timetableProject.findFirst({
    where: { id: projectId, schoolAccountId },
    select: { id: true, name: true },
  });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  if (project.name !== confirmedName.trim()) {
    throw new Error("PROJECT_NAME_MISMATCH");
  }

  await prisma.timetableProject.delete({
    where: { id: project.id },
  });

  return true;
}
