import "server-only";

import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { ImportedTimetableEntry, TimetableImportSourceType } from "@/lib/timetable-import/timetable-import-types";

const PLACEHOLDER_SUBJECT = "غير محددة";
const IMPORT_SOURCE = "IMPORTED";
const DAYS = [
  { id: "SUNDAY", label: "الأحد", aliases: ["الأحد", "الاحد", "SUNDAY"] },
  { id: "MONDAY", label: "الاثنين", aliases: ["الاثنين", "الإثنين", "MONDAY"] },
  { id: "TUESDAY", label: "الثلاثاء", aliases: ["الثلاثاء", "TUESDAY"] },
  { id: "WEDNESDAY", label: "الأربعاء", aliases: ["الأربعاء", "الاربعاء", "WEDNESDAY"] },
  { id: "THURSDAY", label: "الخميس", aliases: ["الخميس", "THURSDAY"] },
] as const;

type PersistenceInput = {
  schoolAccountId: string;
  createdById: string;
  entries: ImportedTimetableEntry[];
  sourceType?: TimetableImportSourceType;
  warnings?: string[];
  name?: string;
  academicYear?: string;
  semester?: string;
};

export class TimetableImportValidationError extends Error {
  constructor(message: string) { super(message); this.name = "TimetableImportValidationError"; }
}

function clean(value: string | null | undefined) { return typeof value === "string" ? value.trim() : ""; }
function resolveDay(value: string) {
  const normalized = clean(value).toLocaleLowerCase("ar");
  return DAYS.find((day) => day.aliases.some((alias) => alias.toLocaleLowerCase("ar") === normalized)) ?? null;
}

type ClassroomCollisionWarning = {
  classroomName: string;
  day: string;
  dayLabel: string;
  period: number;
  entryIndexes: number[];
  message: string;
};

function validateEntries(entries: ImportedTimetableEntry[]) {
  if (!entries.length) throw new TimetableImportValidationError("لا توجد حصص صالحة لاعتمادها.");
  const normalized = entries.map((entry, index) => {
    const teacherName = clean(entry.teacherName), classroomName = clean(entry.classroomName), day = resolveDay(entry.day), period = Number(entry.period);
    if (!teacherName) throw new TimetableImportValidationError(`اسم المعلم مفقود في الصف ${index + 1}.`);
    if (!classroomName) throw new TimetableImportValidationError(`اسم الفصل مفقود في الصف ${index + 1}.`);
    if (!day) throw new TimetableImportValidationError(`اليوم غير صالح في الصف ${index + 1}.`);
    if (!Number.isInteger(period) || period < 1 || period > 7) throw new TimetableImportValidationError(`رقم الحصة غير صالح في الصف ${index + 1}.`);
    return { ...entry, teacherName, classroomName, day, period, subjectName: clean(entry.subjectName) || null, rawCell: clean(entry.rawCell) || null, confidence: typeof entry.confidence === "number" ? entry.confidence : null };
  });
  const teacherSlots = new Set<string>();
  const classroomSlots = new Map<string, { classroomName: string; day: string; dayLabel: string; period: number; entryIndexes: number[] }>();
  normalized.forEach((entry, index) => {
    const teacherKey = `${entry.teacherName}\u0000${entry.day.id}\u0000${entry.period}`;
    if (teacherSlots.has(teacherKey)) throw new TimetableImportValidationError(`يوجد تكرار للمعلم في اليوم والحصة نفسها: ${entry.teacherName}.`);
    teacherSlots.add(teacherKey);

    const classroomKey = `${entry.classroomName}\u0000${entry.day.id}\u0000${entry.period}`;
    const collision = classroomSlots.get(classroomKey);
    if (collision) collision.entryIndexes.push(index + 1);
    else classroomSlots.set(classroomKey, { classroomName: entry.classroomName, day: entry.day.id, dayLabel: entry.day.label, period: entry.period, entryIndexes: [index + 1] });
  });

  const classroomCollisionWarnings: ClassroomCollisionWarning[] = [...classroomSlots.values()]
    .filter((collision) => collision.entryIndexes.length > 1)
    .map((collision) => ({
      ...collision,
      message: `تعارض غير مانع للفصل في اليوم والحصة نفسها: ${collision.classroomName}.`,
    }));

  return { entries: normalized, classroomCollisionWarnings };
}
function json(value: unknown): Prisma.InputJsonValue { return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue; }
function fingerprint(entries: ReturnType<typeof validateEntries>["entries"]) { return createHash("sha256").update(JSON.stringify(entries.map((entry) => ({ teacherName: entry.teacherName, classroomName: entry.classroomName, day: entry.day.id, period: entry.period, subjectName: entry.subjectName, rawCell: entry.rawCell })))).digest("hex"); }

export async function persistReviewedTimetableImport(input: PersistenceInput) {
  const validation = validateEntries(input.entries), entries = validation.entries, projectName = clean(input.name) || "جدول تشغيلي مستورد", academicYear = clean(input.academicYear) || "غير محدد", semester = clean(input.semester) || "الفصل الدراسي الأول";
  const teacherNames = [...new Set(entries.map((entry) => entry.teacherName))], classNames = [...new Set(entries.map((entry) => entry.classroomName))], unresolvedSubjects = entries.some((entry) => !entry.subjectName), importedAt = new Date().toISOString();
  return prisma.$transaction(async (tx) => {
    const owner = await tx.user.findFirst({ where: { id: input.createdById, schoolAccountId: input.schoolAccountId, role: "PRINCIPAL", isActive: true }, select: { id: true } });
    if (!owner) throw new TimetableImportValidationError("School ownership validation failed.");
    const project = await tx.timetableProject.create({ data: { schoolAccountId: input.schoolAccountId, createdById: input.createdById, name: projectName, academicYear, semester, status: "PUBLISHED", daysJson: json(DAYS.map((day, index) => ({ id: day.id, label: day.label, order: index + 1 }))), periodsJson: json(Array.from({ length: 7 }, (_, index) => ({ id: `PERIOD_${index + 1}`, label: `الحصة ${index + 1}`, order: index + 1, isBreak: false, startTime: null, endTime: null }))), settingsJson: json({ timetableV3: { version: 3, setupVersion: 1, stages: [] }, import: { source: IMPORT_SOURCE, sourceType: input.sourceType ?? "EXCEL", importedAt, reviewed: true, unresolvedSubjects } }) } });
    const teachers = new Map<string, string>();
    for (const name of teacherNames) { const teacher = await tx.timetableTeacher.create({ data: { projectId: project.id, name } }); teachers.set(name, teacher.id); }
    const classes = new Map<string, string>();
    for (const name of classNames) { const timetableClass = await tx.timetableClass.create({ data: { projectId: project.id, name } }); classes.set(name, timetableClass.id); }
    const entryClassIds = entries.map((entry) => classes.get(entry.classroomName)!);
    const usedInternalClassNames = new Set(classNames);
    for (const collision of validation.classroomCollisionWarnings) {
      for (const entryIndex of collision.entryIndexes.slice(1)) {
        let internalClassName = `${collision.classroomName}__IMPORT_DISAMBIGUATED_${entryIndex}`;
        while (usedInternalClassNames.has(internalClassName)) internalClassName += "_";
        usedInternalClassNames.add(internalClassName);
        const timetableClass = await tx.timetableClass.create({ data: { projectId: project.id, name: internalClassName } });
        entryClassIds[entryIndex - 1] = timetableClass.id;
      }
    }
    const subjectNames = [...new Set(entries.map((entry) => entry.subjectName).filter((name): name is string => Boolean(name)))];
    if (unresolvedSubjects) subjectNames.push(PLACEHOLDER_SUBJECT);
    const subjects = new Map<string, string>();
    for (const name of subjectNames) {
      const subject = await tx.timetableSubject.create({ data: { projectId: project.id, name } });
      subjects.set(name, subject.id);
    }
    const schedule = await tx.timetableSchedule.create({ data: { projectId: project.id, version: 1, status: "PUBLISHED", isCurrent: true, score: 0, completeness: 100, hardViolations: 0, softPenalty: 0, attemptCount: 1, seed: 0, durationMs: 0, engineVersion: "IMPORTED_TIMETABLE_V1", dataFingerprint: fingerprint(entries), createdById: input.createdById, diagnosticsJson: json({ source: IMPORT_SOURCE, reviewed: true, importedEntries: entries.length, warnings: [...(input.warnings ?? []), ...validation.classroomCollisionWarnings.map((warning) => warning.message)], classroomCollisions: validation.classroomCollisionWarnings, unresolvedSubjects, unresolvedSubjectName: unresolvedSubjects ? PLACEHOLDER_SUBJECT : null }), configJson: json({ source: IMPORT_SOURCE, subjectResolution: unresolvedSubjects ? "UNRESOLVED_PLACEHOLDER" : "IMPORTED" }) } });
    const disambiguatedEntryIndexes = new Set(validation.classroomCollisionWarnings.flatMap((warning) => warning.entryIndexes.slice(1)));
    await tx.timetableScheduleEntry.createMany({ data: entries.map((entry, index) => ({ scheduleId: schedule.id, teacherId: teachers.get(entry.teacherName)!, teacherName: entry.teacherName, classId: entryClassIds[index], className: entry.classroomName, subjectId: subjects.get(entry.subjectName ?? PLACEHOLDER_SUBJECT)!, subjectName: entry.subjectName ?? PLACEHOLDER_SUBJECT, dayId: entry.day.id, dayLabel: entry.day.label, periodId: `PERIOD_${entry.period}`, periodLabel: `الحصة ${entry.period}`, periodOrder: entry.period, isLocked: true, source: IMPORT_SOURCE, placementScore: 0, metadataJson: json({ source: IMPORT_SOURCE, rawCell: entry.rawCell, confidence: entry.confidence, unresolvedSubject: !entry.subjectName, ...(disambiguatedEntryIndexes.has(index + 1) ? { importDisambiguatedClass: true, originalClassroomName: entry.classroomName } : {}) }) })) });
    return { projectId: project.id, scheduleId: schedule.id };
  });
}
