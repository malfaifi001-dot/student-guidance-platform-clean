import "server-only";

import { prisma } from "@/lib/prisma";
import { getActivityPlanDates } from "@/lib/activity-plan/activity-plan-calendar";
import { getActivityPlanProgramByKey } from "@/lib/activity-plan/activity-plan-programs";
import { normalizeActivityPlanStage } from "@/lib/activity-plan/activity-plan-stages";

export type ActivityPlanPrintEntry = {
  stage: string;
  dayOfWeek: number;
  periodNumber: number;
  programKey: string;
  gradeLabel: string;
  teacherName: string;
};

export type ActivityPlanPrintWeek = {
  weekNumber: number;
  dates: ReturnType<typeof getActivityPlanDates>;
  entries: ActivityPlanPrintEntry[];
};

function resolveLegacyProgramKey(title: string | null | undefined) {
  const value = String(title || "").trim();
  const match = [
    "citizenship-life",
    "science-technology",
    "culture-arts",
    "sports-health",
    "scouting",
    "events-occasions",
  ]
    .map((key) => getActivityPlanProgramByKey(key))
    .find((program) => program?.title === value);
  return match?.key || "";
}

export async function getActivityPlanPrintData(schoolAccountId: string, stage?: string | null): Promise<ActivityPlanPrintWeek[]> {
  const selectedStage = normalizeActivityPlanStage(stage);
  const entries = await prisma.activityPlanEntry.findMany({
    where: { schoolAccountId, ...(selectedStage ? { stage: selectedStage } : {}), weekNumber: { gte: 1, lte: 20 } },
    select: {
      weekNumber: true,
      dayOfWeek: true,
      periodNumber: true,
      programKey: true,
      gradeLabel: true,
      teacherName: true,
      stage: true,
      programCaseEntryId: true,
    },
    orderBy: [{ weekNumber: "asc" }, { dayOfWeek: "asc" }, { periodNumber: "asc" }],
  });

  const legacyIds = Array.from(new Set(entries.map((entry) => entry.programCaseEntryId).filter((id): id is string => Boolean(id))));
  const legacyCases = await prisma.caseEntry.findMany({
    where: { schoolAccountId, id: { in: legacyIds } },
    select: {
      id: true,
      values: { where: { fieldKey: "activity_domain" }, select: { value: true }, take: 1 },
    },
  });
  const legacyById = new Map(legacyCases.map((item) => [item.id, item.values[0]?.value || ""]));

  return Array.from({ length: 20 }, (_, index) => {
    const weekNumber = index + 1;
    return {
      weekNumber,
      dates: getActivityPlanDates(weekNumber),
      entries: entries
        .filter((entry) => entry.weekNumber === weekNumber)
        .map((entry) => ({
          dayOfWeek: entry.dayOfWeek,
          periodNumber: entry.periodNumber,
          stage: entry.stage,
          programKey: entry.programKey || resolveLegacyProgramKey(entry.programCaseEntryId ? legacyById.get(entry.programCaseEntryId) : ""),
          gradeLabel: entry.gradeLabel,
          teacherName: entry.teacherName,
        })),
    };
  });
}
