import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ACTIVITY_PLAN_SECTIONS, normalizeActivityPlanStage, REAL_ACTIVITY_PLAN_STAGES } from "@/lib/activity-plan/activity-plan-stages";
import { getTenPercentGradeOptions } from "@/lib/activity-plan/ten-percent-activity-plan-types";

type CopyInput = {
  schoolAccountId: string;
  createdById: string;
  sourceStage: string;
  targetStages: string[];
  mode: "detailed" | "weekly";
  replaceExisting?: boolean;
};

function normalizeStages(values: string[]) {
  return Array.from(new Set(values.map((value) => normalizeActivityPlanStage(value)).filter((value): value is string => Boolean(value))));
}

export type SemesterCopyStrategy = "check" | "empty-only" | "skip" | "replace";

export type SemesterCopyDestination = {
  stage: string;
  grade: string;
  section: string;
};

function destinationKey(destination: SemesterCopyDestination) {
  return `${destination.stage}::${destination.grade}::${destination.section}`;
}

function rowHasDestination(row: { stage: string; grades: unknown }, destination: SemesterCopyDestination) {
  return row.stage === destination.stage && Array.isArray(row.grades) && row.grades.includes(`${destination.grade}::${destination.section}`);
}

function normalizeSemesterDestination(value: SemesterCopyDestination): SemesterCopyDestination | null {
  const stage = normalizeActivityPlanStage(value.stage);
  const grade = String(value.grade || "").trim();
  const section = String(value.section || "").trim();
  if (!stage || !REAL_ACTIVITY_PLAN_STAGES.includes(stage) || !getTenPercentGradeOptions(stage).includes(grade) || !ACTIVITY_PLAN_SECTIONS.includes(section as (typeof ACTIVITY_PLAN_SECTIONS)[number])) return null;
  return { stage, grade, section };
}

export async function copySemesterActivityPlan(input: {
  schoolAccountId: string;
  createdById: string;
  source: SemesterCopyDestination;
  destinations: SemesterCopyDestination[];
  strategy: SemesterCopyStrategy;
}) {
  const source = normalizeSemesterDestination(input.source);
  const destinations = Array.from(new Map(input.destinations.map(normalizeSemesterDestination).filter((value): value is SemesterCopyDestination => Boolean(value)).map((value) => [destinationKey(value), value])).values());
  if (!source || !destinations.length) throw new Error("اختر مصدرًا ووجهة صحيحة للنسخ.");

  const uniqueDestinations = destinations.filter((destination) => destinationKey(destination) !== destinationKey(source));
  if (!uniqueDestinations.length) throw new Error("لا يمكن نسخ النشاط إلى نفس مصدره.");

  return prisma.$transaction(async (tx) => {
    const rows = await tx.activityPlanTenPercentEntry.findMany({
      where: { schoolAccountId: input.schoolAccountId, createdById: input.createdById, stage: { in: Array.from(new Set([source.stage, ...uniqueDestinations.map((destination) => destination.stage)])) } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    const sourceRows = rows.filter((row) => rowHasDestination(row, source));
    if (!sourceRows.length) throw new Error("لا توجد بيانات محفوظة في مصدر النسخ المحدد.");

    const existingDestinations = uniqueDestinations.filter((destination) => rows.some((row) => rowHasDestination(row, destination)));
    if (input.strategy === "check") {
      return { requiresConfirmation: existingDestinations.length > 0, existingDestinations, copiedDestinationCount: 0, copiedRowCount: 0, skippedDestinations: [], replacedDestinations: [] };
    }

    const replaceExisting = input.strategy === "replace";
    const skippedDestinations = replaceExisting ? [] : existingDestinations;
    const destinationsToCopy = replaceExisting ? uniqueDestinations : uniqueDestinations.filter((destination) => !existingDestinations.some((existing) => destinationKey(existing) === destinationKey(destination)));
    if (replaceExisting) {
      const destinationValues = new Set(uniqueDestinations.map((destination) => `${destination.grade}::${destination.section}`));
      const existingRowsToReplace = rows.filter((row) => row.stage && uniqueDestinations.some((destination) => rowHasDestination(row, destination)));
      for (const row of existingRowsToReplace) {
        const remainingGrades = Array.isArray(row.grades) ? row.grades.filter((value): value is string => typeof value === "string" && !destinationValues.has(value)) : [];
        if (remainingGrades.length) {
          await tx.activityPlanTenPercentEntry.update({ where: { id: row.id }, data: { grades: remainingGrades as Prisma.InputJsonValue } });
        } else {
          await tx.activityPlanTenPercentEntry.delete({ where: { id: row.id } });
        }
      }
    }

    const nextSortByStage = new Map<string, number>();
    for (const row of rows) nextSortByStage.set(row.stage, Math.max(nextSortByStage.get(row.stage) ?? -1, row.sortOrder));
    const createData = destinationsToCopy.flatMap((destination) => sourceRows.map((row) => {
      const nextSort = (nextSortByStage.get(destination.stage) ?? -1) + 1;
      nextSortByStage.set(destination.stage, nextSort);
      return {
        schoolAccountId: input.schoolAccountId,
        createdById: input.createdById,
        stage: destination.stage,
        domains: row.domains as Prisma.InputJsonValue,
        programs: row.programs as Prisma.InputJsonValue,
        periodCount: row.periodCount,
        executionWeeks: row.executionWeeks as Prisma.InputJsonValue,
        subject: row.subject,
        grades: [
          `${destination.grade}::${destination.section}`,
        ] as Prisma.InputJsonValue,
        teacherNames: row.teacherNames as Prisma.InputJsonValue,
        sortOrder: nextSort,
      };
    }));
    if (createData.length) await tx.activityPlanTenPercentEntry.createMany({ data: createData });

    return {
      requiresConfirmation: false,
      existingDestinations: [],
      copiedDestinationCount: destinationsToCopy.length,
      copiedRowCount: createData.length,
      skippedDestinations,
      replacedDestinations: replaceExisting ? existingDestinations : [],
    };
  });
}

export async function copyActivityPlan(input: CopyInput) {
  const sourceStage = normalizeActivityPlanStage(input.sourceStage);
  const targetStages = normalizeStages(input.targetStages).filter((stage) => stage !== sourceStage);
  if (!sourceStage || !REAL_ACTIVITY_PLAN_STAGES.includes(sourceStage) || !targetStages.length || targetStages.some((stage) => !REAL_ACTIVITY_PLAN_STAGES.includes(stage))) {
    throw new Error("اختر مراحل صحيحة للنسخ.");
  }

  const result = await prisma.$transaction(async (tx) => {
    if (input.mode === "weekly") {
      const source = await tx.weeklyActivityPlanEntry.findMany({ where: { schoolAccountId: input.schoolAccountId, stage: sourceStage }, orderBy: { weekNumber: "asc" } });
      const existing = await tx.weeklyActivityPlanEntry.findMany({ where: { schoolAccountId: input.schoolAccountId, stage: { in: targetStages } }, select: { stage: true }, distinct: ["stage"] });
      const existingStages = existing.map((entry) => entry.stage);
      if (existingStages.length && !input.replaceExisting) return { requiresConfirmation: true, existingStages, copiedStages: [] };

      if (input.replaceExisting) await tx.weeklyActivityPlanEntry.deleteMany({ where: { schoolAccountId: input.schoolAccountId, stage: { in: targetStages } } });
      if (source.length) {
        await tx.weeklyActivityPlanEntry.createMany({
          data: targetStages.flatMap((stage) => source.map((entry) => ({
            schoolAccountId: input.schoolAccountId,
            createdById: input.createdById,
            stage,
            weekNumber: entry.weekNumber,
            dateFrom: entry.dateFrom,
            dateTo: entry.dateTo,
            periodCount: entry.periodCount,
            items: entry.items as object,
          }))),
        });
      }
      return { requiresConfirmation: false, existingStages: [], copiedStages: targetStages, sourceCount: source.length };
    }

    const source = await tx.activityPlanEntry.findMany({ where: { schoolAccountId: input.schoolAccountId, stage: sourceStage }, orderBy: [{ weekNumber: "asc" }, { dayOfWeek: "asc" }, { periodNumber: "asc" }] });
    const existing = await tx.activityPlanEntry.findMany({ where: { schoolAccountId: input.schoolAccountId, stage: { in: targetStages } }, select: { stage: true }, distinct: ["stage"] });
    const existingStages = existing.map((entry) => entry.stage);
    if (existingStages.length && !input.replaceExisting) return { requiresConfirmation: true, existingStages, copiedStages: [] };

    if (input.replaceExisting) await tx.activityPlanEntry.deleteMany({ where: { schoolAccountId: input.schoolAccountId, stage: { in: targetStages } } });
    if (source.length) {
      await tx.activityPlanEntry.createMany({
        data: targetStages.flatMap((stage) => source.map((entry) => ({
          schoolAccountId: input.schoolAccountId,
          createdById: input.createdById,
          programKey: entry.programKey,
          programCaseEntryId: entry.programCaseEntryId,
          weekNumber: entry.weekNumber,
          dayOfWeek: entry.dayOfWeek,
          periodNumber: entry.periodNumber,
          stage,
          date: entry.date,
          gradeLabel: entry.gradeLabel,
          teacherName: entry.teacherName,
        }))),
      });
    }
    return { requiresConfirmation: false, existingStages: [], copiedStages: targetStages, sourceCount: source.length };
  });

  return result;
}
