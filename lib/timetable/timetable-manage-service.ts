import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { GeneratedTimetableSession } from "@/lib/timetable/timetable-generation-service";

type EditableSession = GeneratedTimetableSession & {
  isLocked?: boolean;
};

export async function saveEditedTimetable(
  projectId: string,
  schoolAccountId: string,
  sessions: EditableSession[],
) {
  const project = await prisma.timetableProject.findFirst({
    where: {
      id: projectId,
      schoolAccountId,
    },
    include: {
      assignments: {
        select: {
          id: true,
          teacherId: true,
          classId: true,
          subjectId: true,
        },
      },
    },
  });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  const settings =
    project.settingsJson &&
    typeof project.settingsJson === "object" &&
    !Array.isArray(project.settingsJson)
      ? (JSON.parse(JSON.stringify(project.settingsJson)) as Prisma.InputJsonObject)
      : {};

  const days = Array.isArray(project.daysJson)
    ? project.daysJson
    : [];

  const periods = Array.isArray(project.periodsJson)
    ? project.periodsJson
    : [];

  const validDays = new Set(
    days.flatMap((item) => {
      if (
        !item ||
        typeof item !== "object" ||
        !("id" in item)
      ) {
        return [];
      }

      return [String(item.id || "")];
    }),
  );

  const validPeriods = new Set(
    periods.flatMap((item) => {
      if (
        !item ||
        typeof item !== "object" ||
        !("id" in item) ||
        ("isBreak" in item && item.isBreak === true)
      ) {
        return [];
      }

      return [String(item.id || "")];
    }),
  );

  const assignments = new Map(
    project.assignments.map((assignment) => [
      assignment.id,
      assignment,
    ]),
  );

  const teacherBusy = new Set<string>();
  const classBusy = new Set<string>();

  for (const session of sessions) {
    const assignment = assignments.get(
      session.assignmentId,
    );

    if (
      !assignment ||
      assignment.teacherId !== session.teacherId ||
      assignment.classId !== session.classId ||
      assignment.subjectId !== session.subjectId
    ) {
      throw new Error("INVALID_SESSION");
    }

    if (
      !validDays.has(session.dayId) ||
      !validPeriods.has(session.periodId)
    ) {
      throw new Error("INVALID_SLOT");
    }

    const slot = `${session.dayId}:${session.periodId}`;
    const teacherKey = `${session.teacherId}:${slot}`;
    const classKey = `${session.classId}:${slot}`;

    if (
      teacherBusy.has(teacherKey) ||
      classBusy.has(classKey)
    ) {
      throw new Error("SCHEDULE_CONFLICT");
    }

    teacherBusy.add(teacherKey);
    classBusy.add(classKey);
  }

  return prisma.timetableProject.update({
    where: {
      id: project.id,
    },
    data: {
      status: "GENERATED",
      settingsJson: {
        ...settings,
        generatedSchedule: sessions,
        generatedAt:
          typeof settings.generatedAt === "string"
            ? settings.generatedAt
            : new Date().toISOString(),
        editedAt: new Date().toISOString(),
      },
    },
  });
}

export async function changeTimetableStatus(
  projectId: string,
  schoolAccountId: string,
  status: "APPROVED" | "PUBLISHED",
) {
  const project = await prisma.timetableProject.findFirst({
    where: {
      id: projectId,
      schoolAccountId,
    },
    select: {
      id: true,
      status: true,
      settingsJson: true,
    },
  });

  if (!project) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  const settings =
    project.settingsJson &&
    typeof project.settingsJson === "object" &&
    !Array.isArray(project.settingsJson)
      ? (JSON.parse(JSON.stringify(project.settingsJson)) as Prisma.InputJsonObject)
      : {};

  const schedule = Array.isArray(
    settings.generatedSchedule,
  )
    ? settings.generatedSchedule
    : [];

  if (!schedule.length) {
    throw new Error("SCHEDULE_REQUIRED");
  }

  if (
    status === "PUBLISHED" &&
    project.status !== "APPROVED" &&
    project.status !== "PUBLISHED"
  ) {
    throw new Error("APPROVAL_REQUIRED");
  }

  return prisma.timetableProject.update({
    where: {
      id: project.id,
    },
    data: {
      status,
      settingsJson: {
        ...settings,
        approvedAt:
          status === "APPROVED"
            ? new Date().toISOString()
            : settings.approvedAt,
        publishedAt:
          status === "PUBLISHED"
            ? new Date().toISOString()
            : settings.publishedAt,
      },
    },
  });
}
