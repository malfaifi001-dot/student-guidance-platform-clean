import "server-only";

import { prisma } from "@/lib/prisma";
import { normalizeActivityPlanStage, REAL_ACTIVITY_PLAN_STAGES } from "@/lib/activity-plan/activity-plan-stages";

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
