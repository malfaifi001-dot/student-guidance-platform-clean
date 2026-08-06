import "server-only";

import { prisma } from "@/lib/prisma";
import type {
  TimetableConstraint,
} from "@/lib/timetable/timetable-constraint-types";

export async function getTimetableConstraints(
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
      settingsJson: true,
      daysJson: true,
      periodsJson: true,
      teachers: {
        select: {
          id: true,
        },
      },
      classes: {
        select: {
          id: true,
        },
      },
      subjects: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!project) {
    return null;
  }

  const settings = normalizeRecord(
    project.settingsJson,
  );

  const constraintsSettings = normalizeRecord(
    settings.constraints,
  );

  return {
    constraints: normalizeConstraints(
      constraintsSettings.items,
    ),
    project,
  };
}

export async function saveTimetableConstraints(
  projectId: string,
  schoolAccountId: string,
  constraints: TimetableConstraint[],
) {
  const current = await getTimetableConstraints(
    projectId,
    schoolAccountId,
  );

  if (!current) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  validateReferences(
    constraints,
    current.project,
  );

  const settings = normalizeRecord(
    current.project.settingsJson,
  );

  return prisma.timetableProject.update({
    where: {
      id: projectId,
    },
    data: {
      settingsJson: {
        ...settings,
        constraints: {
          version: "1",
          items: constraints,
          updatedAt: new Date().toISOString(),
        },
      },
    },
  });
}

function validateReferences(
  constraints: TimetableConstraint[],
  project: {
    teachers: Array<{ id: string }>;
    classes: Array<{ id: string }>;
    subjects: Array<{ id: string }>;
    settingsJson: unknown;
    daysJson: unknown;
    periodsJson: unknown;
  },
) {
  const teacherIds = new Set(
    project.teachers.map((item) => item.id),
  );

  const classIds = new Set(
    project.classes.map((item) => item.id),
  );

  const subjectIds = new Set(
    project.subjects.map((item) => item.id),
  );

  const dayIds = new Set(
    normalizeIds(project.daysJson),
  );

  const settings = normalizeRecord(
    project.settingsJson,
  );

  const roomIds = new Set(
    normalizeRoomIds(settings.rooms),
  );

  const periodIds = new Set(
    normalizeIds(
      project.periodsJson,
      true,
    ),
  );

  for (const constraint of constraints) {
    if (
      constraint.teacherId &&
      !teacherIds.has(constraint.teacherId)
    ) {
      throw new Error("INVALID_TEACHER");
    }

    if (
      constraint.classId &&
      !classIds.has(constraint.classId)
    ) {
      throw new Error("INVALID_CLASS");
    }

    if (
      constraint.subjectId &&
      !subjectIds.has(constraint.subjectId)
    ) {
      throw new Error("INVALID_SUBJECT");
    }

    if (
      constraint.subjectIds?.some(
        (id) => !subjectIds.has(id),
      )
    ) {
      throw new Error("INVALID_SUBJECT");
    }

    if (
      constraint.dayId &&
      !dayIds.has(constraint.dayId)
    ) {
      throw new Error("INVALID_DAY");
    }

    if (
      constraint.periodId &&
      !periodIds.has(constraint.periodId)
    ) {
      throw new Error("INVALID_PERIOD");
    }
  }
}

function normalizeConstraints(
  value: unknown,
): TimetableConstraint[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is TimetableConstraint =>
      Boolean(
        item &&
          typeof item === "object" &&
          "id" in item &&
          "type" in item,
      ),
  );
}

function normalizeRecord(
  value: unknown,
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as Record<string, unknown>;
}

function normalizeIds(
  value: unknown,
  excludeBreaks = false,
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      !("id" in item)
    ) {
      return [];
    }

    if (
      excludeBreaks &&
      "isBreak" in item &&
      item.isBreak === true
    ) {
      return [];
    }

    const id = String(item.id || "");

    return id ? [id] : [];
  });
}
function normalizeRoomIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item) ||
      !("id" in item)
    ) {
      return [];
    }

    const id = String(item.id || "");
    return id ? [id] : [];
  });
}
