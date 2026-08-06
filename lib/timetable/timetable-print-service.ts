import "server-only";

import { prisma } from "@/lib/prisma";
import type { GeneratedTimetableSession } from "@/lib/timetable/timetable-generation-service";

type TimetableDay = {
  id: string;
  label: string;
  order: number;
};

type TimetablePeriod = {
  id: string;
  label: string;
  order: number;
  isBreak?: boolean;
  startTime?: string;
  endTime?: string;
};

export async function getTimetablePrintData(
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
      name: true,
      academicYear: true,
      semester: true,
      status: true,
      daysJson: true,
      periodsJson: true,
      settingsJson: true,
    },
  });

  if (!project) {
    return null;
  }

  const settings =
    project.settingsJson &&
    typeof project.settingsJson === "object" &&
    !Array.isArray(project.settingsJson)
      ? (project.settingsJson as Record<string, unknown>)
      : {};

  const sessions = Array.isArray(settings.generatedSchedule)
    ? (settings.generatedSchedule as GeneratedTimetableSession[])
    : [];

  return {
    id: project.id,
    name: project.name,
    academicYear: project.academicYear,
    semester: project.semester,
    status: project.status,
    days: normalizeDays(project.daysJson),
    periods: normalizePeriods(project.periodsJson),
    sessions,
    generatedAt:
      typeof settings.generatedAt === "string"
        ? settings.generatedAt
        : null,
  };
}

function normalizeDays(value: unknown): TimetableDay[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((item, index) => {
      if (!item || typeof item !== "object") {
        return [];
      }

      const record = item as Record<string, unknown>;
      const id = String(record.id || "");
      const label = String(record.label || "");

      if (!id || !label) {
        return [];
      }

      return [{
        id,
        label,
        order:
          typeof record.order === "number"
            ? record.order
            : index,
      }];
    })
    .sort((first, second) => first.order - second.order);
}

function normalizePeriods(
  value: unknown,
): TimetablePeriod[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((item, index) => {
      if (!item || typeof item !== "object") {
        return [];
      }

      const record = item as Record<string, unknown>;
      const id = String(record.id || "");
      const label = String(record.label || "");

      if (!id || !label) {
        return [];
      }

      return [{
        id,
        label,
        order:
          typeof record.order === "number"
            ? record.order
            : index,
        isBreak: record.isBreak === true,
        startTime:
          typeof record.startTime === "string"
            ? record.startTime
            : undefined,
        endTime:
          typeof record.endTime === "string"
            ? record.endTime
            : undefined,
      }];
    })
    .filter((period) => !period.isBreak)
    .sort((first, second) => first.order - second.order);
}