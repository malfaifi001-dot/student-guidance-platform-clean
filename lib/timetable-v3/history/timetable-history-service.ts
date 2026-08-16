import "server-only";

import {
  Prisma,
} from "@prisma/client";

import {
  getCurrentSessionUser,
} from "@/lib/auth/current-user";

import {
  prisma,
} from "@/lib/prisma";

export const TIMETABLE_HISTORY_ACTIONS = {
  STAGES_UPDATED: "STAGES_UPDATED",
  STAGE_WEEKLY_TARGET_UPDATED: "STAGE_WEEKLY_TARGET_UPDATED",
  STUDY_DAYS_UPDATED: "STUDY_DAYS_UPDATED",
  PERIODS_UPDATED: "PERIODS_UPDATED",
  CLASSES_UPDATED: "CLASSES_UPDATED",
  CLASS_MAPPING_UPDATED: "CLASS_MAPPING_UPDATED",
  SUBJECTS_UPDATED: "SUBJECTS_UPDATED",
  TEACHERS_UPDATED: "TEACHERS_UPDATED",
  ASSIGNMENT_CREATED: "ASSIGNMENT_CREATED",
  ASSIGNMENT_UPDATED: "ASSIGNMENT_UPDATED",
  ASSIGNMENT_REMOVED: "ASSIGNMENT_REMOVED",
  CONSTRAINT_CREATED: "CONSTRAINT_CREATED",
  CONSTRAINT_UPDATED: "CONSTRAINT_UPDATED",
  CONSTRAINT_REMOVED: "CONSTRAINT_REMOVED",
  UNDO_APPLIED: "UNDO_APPLIED",
  REDO_APPLIED: "REDO_APPLIED",
} as const;

export type TimetableHistoryActionType =
  typeof TIMETABLE_HISTORY_ACTIONS[keyof typeof TIMETABLE_HISTORY_ACTIONS];

export type TimetableHistorySnapshot = unknown;

export type TimetableHistoryDb = typeof prisma | Prisma.TransactionClient;

type HistoryInput = {
  projectId: string;
  schoolAccountId: string;
  actionType: TimetableHistoryActionType;
  entityType?: string | null;
  entityId?: string | null;
  before: TimetableHistorySnapshot;
  after: TimetableHistorySnapshot;
  metadata?: Record<string, unknown> | null;
  actorUserId?: string | null;
};

function jsonSafe(value: unknown): Prisma.InputJsonValue | null {
  if (value == null) return null;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => jsonSafe(item) ?? null) as Prisma.InputJsonValue;
  }
  if (typeof value === "object") {
    const result: Record<string, Prisma.InputJsonValue> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      const safe = jsonSafe(item);
      if (safe !== null) result[key] = safe;
    }
    return result as Prisma.InputJsonValue;
  }
  return String(value);
}

function jsonValue(value: unknown) {
  const safe = jsonSafe(value);
  return safe === null ? Prisma.JsonNull : safe;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }

  return value;
}

function sameSnapshot(left: unknown, right: unknown) {
  return JSON.stringify(stableValue(left)) ===
    JSON.stringify(stableValue(right));
}

function normalizeRows(value: unknown) {
  return Array.isArray(value)
    ? [...value].sort((left, right) =>
      String((left as { id?: unknown }).id ?? "")
        .localeCompare(String((right as { id?: unknown }).id ?? "")),
    )
    : [];
}

async function actorId() {
  try {
    const current = await getCurrentSessionUser();
    return current?.user?.id ?? null;
  } catch {
    return null;
  }
}

async function projectSettingsSnapshot(
  db: TimetableHistoryDb,
  projectId: string,
  key: "stages" | "stageWeeklyPeriodTargets" | "classMappings",
) {
  const project = await db.timetableProject.findUnique({
    where: { id: projectId },
    select: { settingsJson: true },
  });
  const timetableV3 = objectValue(objectValue(project?.settingsJson).timetableV3);
  return timetableV3[key] ?? (key === "classMappings" ? {} : []);
}

async function projectJsonSnapshot(
  db: TimetableHistoryDb,
  projectId: string,
  key: "daysJson" | "periodsJson",
) {
  const project = await db.timetableProject.findUnique({
    where: { id: projectId },
    select: { daysJson: true, periodsJson: true },
  });
  return project?.[key] ?? [];
}

async function collectionSnapshot(
  db: TimetableHistoryDb,
  projectId: string,
  type: "classes" | "subjects" | "teachers",
) {
  if (type === "classes") {
    return normalizeRows(await db.timetableClass.findMany({
      where: { projectId },
      select: { id: true, name: true, isActive: true },
    }));
  }

  if (type === "subjects") {
    return normalizeRows(await db.timetableSubject.findMany({
      where: { projectId },
      select: { id: true, name: true, catalogKey: true, isActive: true },
    }));
  }

  return normalizeRows(await db.timetableTeacher.findMany({
    where: { projectId },
    select: {
      id: true,
      name: true,
      specialty: true,
      maxWeeklyLoad: true,
      isActive: true,
    },
  }));
}

async function assignmentSnapshot(
  db: TimetableHistoryDb,
  assignmentId: string,
) {
  const assignment = await db.timetableAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      projectId: true,
      teacherId: true,
      classId: true,
      subjectId: true,
      assignedLessons: true,
      singlePeriods: true,
      doublePeriods: true,
      fixedSlotsJson: true,
    },
  });
  return assignment;
}

async function constraintSnapshot(
  db: TimetableHistoryDb,
  constraintId: string,
) {
  const constraint = await db.timetableConstraint.findUnique({
    where: { id: constraintId },
    include: {
      teachers: { select: { teacherId: true } },
      subjects: { select: { subjectId: true } },
      classes: { select: { classId: true } },
      days: { select: { dayId: true } },
      periods: { select: { periodId: true } },
      slots: { select: { dayId: true, periodId: true } },
    },
  });

  if (!constraint) {
    return null;
  }

  return {
    id: constraint.id,
    projectId: constraint.projectId,
    type: constraint.type,
    strength: constraint.strength,
    title: constraint.title,
    valueInt: constraint.valueInt,
    notes: constraint.notes,
    configJson: constraint.configJson,
    isActive: constraint.isActive,
    teacherIds: constraint.teachers.map((item) => item.teacherId).sort(),
    subjectIds: constraint.subjects.map((item) => item.subjectId).sort(),
    classIds: constraint.classes.map((item) => item.classId).sort(),
    dayIds: constraint.days.map((item) => item.dayId).sort(),
    periodIds: constraint.periods.map((item) => item.periodId).sort(),
    slots: constraint.slots
      .map((item) => ({ dayId: item.dayId, periodId: item.periodId }))
      .sort((left, right) => `${left.dayId}:${left.periodId}`.localeCompare(`${right.dayId}:${right.periodId}`)),
  };
}

export async function getTimetableHistorySnapshot(
  projectId: string,
  actionType: TimetableHistoryActionType,
  entityId?: string | null,
  db: TimetableHistoryDb = prisma,
): Promise<TimetableHistorySnapshot> {
  switch (actionType) {
    case TIMETABLE_HISTORY_ACTIONS.STAGES_UPDATED:
      return projectSettingsSnapshot(db, projectId, "stages");
    case TIMETABLE_HISTORY_ACTIONS.STAGE_WEEKLY_TARGET_UPDATED:
      return projectSettingsSnapshot(db, projectId, "stageWeeklyPeriodTargets");
    case TIMETABLE_HISTORY_ACTIONS.STUDY_DAYS_UPDATED:
      return projectJsonSnapshot(db, projectId, "daysJson");
    case TIMETABLE_HISTORY_ACTIONS.PERIODS_UPDATED:
      return projectJsonSnapshot(db, projectId, "periodsJson");
    case TIMETABLE_HISTORY_ACTIONS.CLASSES_UPDATED:
      return collectionSnapshot(db, projectId, "classes");
    case TIMETABLE_HISTORY_ACTIONS.SUBJECTS_UPDATED:
      return collectionSnapshot(db, projectId, "subjects");
    case TIMETABLE_HISTORY_ACTIONS.TEACHERS_UPDATED:
      return collectionSnapshot(db, projectId, "teachers");
    case TIMETABLE_HISTORY_ACTIONS.CLASS_MAPPING_UPDATED:
      return projectSettingsSnapshot(db, projectId, "classMappings");
    case TIMETABLE_HISTORY_ACTIONS.ASSIGNMENT_CREATED:
    case TIMETABLE_HISTORY_ACTIONS.ASSIGNMENT_UPDATED:
    case TIMETABLE_HISTORY_ACTIONS.ASSIGNMENT_REMOVED:
      return entityId ? assignmentSnapshot(db, entityId) : null;
    case TIMETABLE_HISTORY_ACTIONS.CONSTRAINT_CREATED:
    case TIMETABLE_HISTORY_ACTIONS.CONSTRAINT_UPDATED:
    case TIMETABLE_HISTORY_ACTIONS.CONSTRAINT_REMOVED:
      return entityId ? constraintSnapshot(db, entityId) : null;
    default:
      return null;
  }
}

export async function recordTimetableHistory(
  input: HistoryInput,
  db: TimetableHistoryDb = prisma,
) {
  if (sameSnapshot(input.before, input.after)) {
    return null;
  }

  const actorUserId = input.actorUserId === undefined
    ? await actorId()
    : input.actorUserId;

  await db.timetableProjectHistoryEntry.updateMany({
    where: {
      projectId: input.projectId,
      state: "UNDONE",
    },
    data: { state: "SUPERSEDED" },
  });

  return db.timetableProjectHistoryEntry.create({
    data: {
      projectId: input.projectId,
      schoolAccountId: input.schoolAccountId,
      actorUserId,
      actionType: input.actionType,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      state: "ACTIVE",
      beforeJson: jsonValue(input.before),
      afterJson: jsonValue(input.after),
      metadataJson: input.metadata ? jsonValue(input.metadata) : undefined,
    },
  });
}

async function updateProjectSettings(
  db: TimetableHistoryDb,
  projectId: string,
  key: string,
  value: unknown,
) {
  const project = await db.timetableProject.findUnique({
    where: { id: projectId },
    select: { settingsJson: true },
  });
  const settings = objectValue(project?.settingsJson);
  const timetableV3 = objectValue(settings.timetableV3);

  await db.timetableProject.update({
    where: { id: projectId },
    data: {
      settingsJson: {
        ...settings,
        timetableV3: {
          ...timetableV3,
          [key]: value,
        },
      } as Prisma.InputJsonValue,
    },
  });
}

async function restoreCollection(
  db: TimetableHistoryDb,
  projectId: string,
  type: "classes" | "subjects" | "teachers",
  snapshot: unknown,
) {
  const desired = normalizeRows(snapshot) as Array<Record<string, unknown>>;
  const desiredIds = new Set(desired.map((item) => String(item.id)));

  if (type === "classes") {
    const current = await db.timetableClass.findMany({ where: { projectId }, select: { id: true } });
    for (const item of desired) {
      await db.timetableClass.upsert({
        where: { id: String(item.id) },
        update: { name: String(item.name), isActive: Boolean(item.isActive) },
        create: { id: String(item.id), projectId, name: String(item.name), isActive: Boolean(item.isActive) },
      });
    }
    for (const item of current) {
      if (!desiredIds.has(item.id)) {
        const [assignments, subjects, constraints] = await Promise.all([
          db.timetableAssignment.count({ where: { classId: item.id } }),
          db.timetableClassSubject.count({ where: { classId: item.id } }),
          db.timetableConstraintClass.count({ where: { classId: item.id } }),
        ]);
        if (assignments || subjects || constraints) {
          await db.timetableClass.update({ where: { id: item.id }, data: { isActive: false } });
        } else {
          await db.timetableClass.delete({ where: { id: item.id } });
        }
      }
    }
    return;
  }

  if (type === "subjects") {
    const current = await db.timetableSubject.findMany({ where: { projectId }, select: { id: true } });
    for (const item of desired) {
      await db.timetableSubject.upsert({
        where: { id: String(item.id) },
        update: { name: String(item.name), catalogKey: item.catalogKey == null ? null : String(item.catalogKey), isActive: Boolean(item.isActive) },
        create: { id: String(item.id), projectId, name: String(item.name), catalogKey: item.catalogKey == null ? null : String(item.catalogKey), isActive: Boolean(item.isActive) },
      });
    }
    for (const item of current) {
      if (!desiredIds.has(item.id)) {
        const [assignments, classSubjects, constraints] = await Promise.all([
          db.timetableAssignment.count({ where: { subjectId: item.id } }),
          db.timetableClassSubject.count({ where: { subjectId: item.id } }),
          db.timetableConstraintSubject.count({ where: { subjectId: item.id } }),
        ]);
        if (assignments || classSubjects || constraints) {
          await db.timetableSubject.update({ where: { id: item.id }, data: { isActive: false } });
        } else {
          await db.timetableSubject.delete({ where: { id: item.id } });
        }
      }
    }
    return;
  }

  const current = await db.timetableTeacher.findMany({ where: { projectId }, select: { id: true } });
  for (const item of desired) {
    await db.timetableTeacher.upsert({
      where: { id: String(item.id) },
      update: { name: String(item.name), specialty: item.specialty == null ? null : String(item.specialty), maxWeeklyLoad: Number(item.maxWeeklyLoad), isActive: Boolean(item.isActive) },
      create: { id: String(item.id), projectId, name: String(item.name), specialty: item.specialty == null ? null : String(item.specialty), maxWeeklyLoad: Number(item.maxWeeklyLoad), isActive: Boolean(item.isActive) },
    });
  }
  for (const item of current) {
    if (!desiredIds.has(item.id)) {
      const [assignments, absences, constraints] = await Promise.all([
        db.timetableAssignment.count({ where: { teacherId: item.id } }),
        db.timetableDailyAbsence.count({ where: { teacherId: item.id } }),
        db.timetableConstraintTeacher.count({ where: { teacherId: item.id } }),
      ]);
      if (assignments || absences || constraints) {
        await db.timetableTeacher.update({ where: { id: item.id }, data: { isActive: false } });
      } else {
        await db.timetableTeacher.delete({ where: { id: item.id } });
      }
    }
  }
}

async function restoreAssignment(db: TimetableHistoryDb, snapshot: Record<string, unknown> | null) {
  if (!snapshot) {
    return;
  }
  const data = {
    teacherId: String(snapshot.teacherId),
    classId: String(snapshot.classId),
    subjectId: String(snapshot.subjectId),
    assignedLessons: Number(snapshot.assignedLessons),
    singlePeriods: Number(snapshot.singlePeriods ?? 0),
    doublePeriods: Number(snapshot.doublePeriods ?? 0),
    fixedSlotsJson: jsonValue(snapshot.fixedSlotsJson),
  };
  await db.timetableAssignment.upsert({
    where: { id: String(snapshot.id) },
    update: data,
    create: { id: String(snapshot.id), projectId: String(snapshot.projectId), ...data },
  });
}

async function applyConstraintSnapshot(db: TimetableHistoryDb, snapshot: Record<string, unknown> | null) {
  if (!snapshot) {
    return;
  }
  const id = String(snapshot.id);
  const links = {
    teacherIds: Array.isArray(snapshot.teacherIds) ? snapshot.teacherIds.map(String) : [],
    subjectIds: Array.isArray(snapshot.subjectIds) ? snapshot.subjectIds.map(String) : [],
    classIds: Array.isArray(snapshot.classIds) ? snapshot.classIds.map(String) : [],
    dayIds: Array.isArray(snapshot.dayIds) ? snapshot.dayIds.map(String) : [],
    periodIds: Array.isArray(snapshot.periodIds) ? snapshot.periodIds.map(String) : [],
    slots: Array.isArray(snapshot.slots) ? snapshot.slots as Array<{ dayId: string; periodId: string }> : [],
  };
  const base = {
    type: String(snapshot.type),
    strength: String(snapshot.strength),
    title: snapshot.title == null ? null : String(snapshot.title),
    valueInt: snapshot.valueInt == null ? null : Number(snapshot.valueInt),
    notes: snapshot.notes == null ? null : String(snapshot.notes),
    configJson: jsonValue(snapshot.configJson),
    isActive: Boolean(snapshot.isActive),
  };
  await db.timetableConstraint.upsert({
    where: { id },
    update: base,
    create: { id, projectId: String(snapshot.projectId), ...base },
  });
  await Promise.all([
    db.timetableConstraintTeacher.deleteMany({ where: { constraintId: id } }),
    db.timetableConstraintSubject.deleteMany({ where: { constraintId: id } }),
    db.timetableConstraintClass.deleteMany({ where: { constraintId: id } }),
    db.timetableConstraintDay.deleteMany({ where: { constraintId: id } }),
    db.timetableConstraintPeriod.deleteMany({ where: { constraintId: id } }),
    db.timetableConstraintSlot.deleteMany({ where: { constraintId: id } }),
  ]);
  await Promise.all([
    db.timetableConstraintTeacher.createMany({ data: links.teacherIds.map((teacherId) => ({ constraintId: id, teacherId })) }),
    db.timetableConstraintSubject.createMany({ data: links.subjectIds.map((subjectId) => ({ constraintId: id, subjectId })) }),
    db.timetableConstraintClass.createMany({ data: links.classIds.map((classId) => ({ constraintId: id, classId })) }),
    db.timetableConstraintDay.createMany({ data: links.dayIds.map((dayId) => ({ constraintId: id, dayId })) }),
    db.timetableConstraintPeriod.createMany({ data: links.periodIds.map((periodId) => ({ constraintId: id, periodId })) }),
    db.timetableConstraintSlot.createMany({ data: links.slots.map((slot) => ({ constraintId: id, dayId: slot.dayId, periodId: slot.periodId })) }),
  ]);
}

async function applySnapshot(
  db: TimetableHistoryDb,
  entry: { actionType: string; projectId: string; entityId: string | null },
  snapshot: unknown,
) {
  switch (entry.actionType) {
    case TIMETABLE_HISTORY_ACTIONS.STAGES_UPDATED:
      return updateProjectSettings(db, entry.projectId, "stages", snapshot);
    case TIMETABLE_HISTORY_ACTIONS.STAGE_WEEKLY_TARGET_UPDATED:
      return updateProjectSettings(db, entry.projectId, "stageWeeklyPeriodTargets", snapshot);
    case TIMETABLE_HISTORY_ACTIONS.CLASS_MAPPING_UPDATED:
      return updateProjectSettings(db, entry.projectId, "classMappings", snapshot);
    case TIMETABLE_HISTORY_ACTIONS.STUDY_DAYS_UPDATED:
      return db.timetableProject.update({ where: { id: entry.projectId }, data: { daysJson: jsonValue(snapshot) } });
    case TIMETABLE_HISTORY_ACTIONS.PERIODS_UPDATED:
      return db.timetableProject.update({ where: { id: entry.projectId }, data: { periodsJson: jsonValue(snapshot) } });
    case TIMETABLE_HISTORY_ACTIONS.CLASSES_UPDATED:
      return restoreCollection(db, entry.projectId, "classes", snapshot);
    case TIMETABLE_HISTORY_ACTIONS.SUBJECTS_UPDATED:
      return restoreCollection(db, entry.projectId, "subjects", snapshot);
    case TIMETABLE_HISTORY_ACTIONS.TEACHERS_UPDATED:
      return restoreCollection(db, entry.projectId, "teachers", snapshot);
    case TIMETABLE_HISTORY_ACTIONS.ASSIGNMENT_CREATED:
    case TIMETABLE_HISTORY_ACTIONS.ASSIGNMENT_UPDATED:
    case TIMETABLE_HISTORY_ACTIONS.ASSIGNMENT_REMOVED:
      if (snapshot == null) {
        if (entry.entityId) await db.timetableAssignment.deleteMany({ where: { id: entry.entityId } });
        return;
      }
      return restoreAssignment(db, snapshot as Record<string, unknown>);
    case TIMETABLE_HISTORY_ACTIONS.CONSTRAINT_CREATED:
    case TIMETABLE_HISTORY_ACTIONS.CONSTRAINT_UPDATED:
    case TIMETABLE_HISTORY_ACTIONS.CONSTRAINT_REMOVED:
      if (snapshot == null) {
        if (entry.entityId) await db.timetableConstraint.deleteMany({ where: { id: entry.entityId } });
        return;
      }
      return applyConstraintSnapshot(db, snapshot as Record<string, unknown>);
    default:
      return;
  }
}

export async function listTimetableHistory(
  projectId: string,
  schoolAccountId: string,
  limit = 50,
) {
  const entries = await prisma.timetableProjectHistoryEntry.findMany({
    where: { projectId, schoolAccountId },
    include: {
      actorUser: { select: { name: true, officialName: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: Math.min(Math.max(limit, 1), 50),
  });
  const [canUndo, canRedo] = await Promise.all([
    prisma.timetableProjectHistoryEntry.count({ where: { projectId, schoolAccountId, state: "ACTIVE" } }),
    prisma.timetableProjectHistoryEntry.count({ where: { projectId, schoolAccountId, state: "UNDONE" } }),
  ]);
  return {
    entries: entries.map((entry) => ({
      id: entry.id,
      actionType: entry.actionType,
      entityType: entry.entityType,
      entityId: entry.entityId,
      metadata: entry.metadataJson,
      detail: historyDetail(entry.actionType, entry.beforeJson, entry.afterJson),
      state: entry.state,
      reverted: entry.state === "UNDONE" || entry.state === "SUPERSEDED",
      actorName: entry.actorUser?.officialName ?? entry.actorUser?.name ?? null,
      createdAt: entry.createdAt,
    })),
    canUndo: canUndo > 0,
    canRedo: canRedo > 0,
  };
}

function historyDetail(actionType: string, before: unknown, after: unknown) {
  if (actionType === TIMETABLE_HISTORY_ACTIONS.STAGE_WEEKLY_TARGET_UPDATED) {
    const beforeValue = objectValue(before);
    const afterValue = objectValue(after);
    const stageId = Object.keys(afterValue)[0] ?? Object.keys(beforeValue)[0];
    if (stageId) {
      const stage = stageId === "ELEMENTARY"
        ? "الابتدائي"
        : stageId === "MIDDLE"
          ? "المتوسط"
          : "الثانوي";
      return `من ${beforeValue[stageId] ?? "—"} إلى ${afterValue[stageId] ?? "—"} حصة في ${stage}.`;
    }
  }
  if (actionType.endsWith("CREATED")) return "تمت الإضافة بنجاح.";
  if (actionType.endsWith("REMOVED")) return "تم الحذف بنجاح.";
  return "تم حفظ التعديل بنجاح.";
}

async function requireHistoryProject(projectId: string, schoolAccountId: string) {
  const project = await prisma.timetableProject.findFirst({ where: { id: projectId, schoolAccountId }, select: { id: true } });
  if (!project) throw new Error("PROJECT_NOT_FOUND");
}

export async function undoTimetableHistory(projectId: string, schoolAccountId: string) {
  await requireHistoryProject(projectId, schoolAccountId);
  const actorUserId = await actorId();
  return prisma.$transaction(async (tx) => {
    const entry = await tx.timetableProjectHistoryEntry.findFirst({
      where: { projectId, schoolAccountId, state: "ACTIVE" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    if (!entry) throw new Error("HISTORY_EMPTY");
    const current = await getTimetableHistorySnapshot(projectId, entry.actionType as TimetableHistoryActionType, entry.entityId, tx);
    if (!sameSnapshot(current, entry.afterJson)) throw new Error("HISTORY_CONFLICT");
    await applySnapshot(tx, entry, entry.beforeJson);
    await tx.timetableProjectHistoryEntry.update({ where: { id: entry.id }, data: { state: "UNDONE", revertedAt: new Date(), revertedByUserId: actorUserId } });
    await tx.timetableProjectHistoryEntry.create({
      data: {
        projectId,
        schoolAccountId,
        actorUserId,
        actionType: TIMETABLE_HISTORY_ACTIONS.UNDO_APPLIED,
        entityType: entry.entityType,
        entityId: entry.entityId,
        state: "SYSTEM",
        beforeJson: jsonValue(entry.afterJson),
        afterJson: jsonValue(entry.beforeJson),
        metadataJson: jsonValue({ originalHistoryId: entry.id }),
      },
    });
    return entry;
  });
}

export async function redoTimetableHistory(projectId: string, schoolAccountId: string) {
  await requireHistoryProject(projectId, schoolAccountId);
  const actorUserId = await actorId();
  return prisma.$transaction(async (tx) => {
    const entry = await tx.timetableProjectHistoryEntry.findFirst({
      where: { projectId, schoolAccountId, state: "UNDONE" },
      orderBy: [{ revertedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    });
    if (!entry) throw new Error("HISTORY_EMPTY");
    const current = await getTimetableHistorySnapshot(projectId, entry.actionType as TimetableHistoryActionType, entry.entityId, tx);
    if (!sameSnapshot(current, entry.beforeJson)) throw new Error("HISTORY_CONFLICT");
    await applySnapshot(tx, entry, entry.afterJson);
    await tx.timetableProjectHistoryEntry.update({ where: { id: entry.id }, data: { state: "ACTIVE", revertedAt: null, revertedByUserId: null } });
    await tx.timetableProjectHistoryEntry.create({
      data: {
        projectId,
        schoolAccountId,
        actorUserId,
        actionType: TIMETABLE_HISTORY_ACTIONS.REDO_APPLIED,
        entityType: entry.entityType,
        entityId: entry.entityId,
        state: "SYSTEM",
        beforeJson: jsonValue(entry.beforeJson),
        afterJson: jsonValue(entry.afterJson),
        metadataJson: jsonValue({ originalHistoryId: entry.id }),
      },
    });
    return entry;
  });
}
