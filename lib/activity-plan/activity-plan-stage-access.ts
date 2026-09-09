import "server-only";

import { prisma } from "@/lib/prisma";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { getActivityPlanStagesFromProfile, getActivityPlanStagesForActivityLeader } from "@/lib/activity-plan/activity-plan-stages";

type CurrentActivityLeader = NonNullable<Awaited<ReturnType<typeof getCurrentSessionUser>>>;

export async function getActivityPlanLeaderAllowedStages(current: CurrentActivityLeader) {
  const schoolAccountId = current.user.schoolAccountId as string;
  const [students, stageEntries, tenPercentStageEntries] = await Promise.all([
    prisma.student.findMany({ where: { schoolAccountId, isActive: true }, select: { stage: true } }),
    prisma.activityPlanEntry.findMany({ where: { schoolAccountId }, select: { stage: true } }),
    prisma.activityPlanTenPercentEntry.findMany({ where: { schoolAccountId }, select: { stage: true } }),
  ]);

  return getActivityPlanStagesForActivityLeader(current.user.teachingStages, [
    ...getActivityPlanStagesFromProfile(current.user.schoolAccount?.profile?.stage),
    ...students.map((student) => student.stage),
    ...stageEntries.map((entry) => entry.stage),
    ...tenPercentStageEntries.map((entry) => entry.stage),
  ]);
}
