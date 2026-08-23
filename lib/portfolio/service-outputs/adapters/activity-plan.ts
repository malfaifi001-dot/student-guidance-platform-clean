import "server-only";

import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getActivityPlanDates, getPeriodLabel } from "@/lib/activity-plan/activity-plan-calendar";
import { getActivityPlanPrintData } from "@/lib/activity-plan/activity-plan-print-data";
import { getActivityPlanProgramByKey } from "@/lib/activity-plan/activity-plan-programs";
import { getOrCreateActivityPlanShareToken } from "@/lib/activity-plan/activity-plan-share-service";
import type { PortfolioServiceOutput } from "@/lib/portfolio/service-outputs/service-output-types";

type ActivityPlanLink = {
  id: string;
  serviceSlug: string;
  resourceType: string;
  performanceItemKey: string;
  targetSectionKey: string | null;
  displayTitle: string;
  createdAt: Date;
};

export async function resolveActivityPlanPortfolioOutput(schoolAccountId: string, ownerUserId: string, link: ActivityPlanLink): Promise<PortfolioServiceOutput> {
  const source = await getActivityPlanPrintData(schoolAccountId);
  const populatedWeeks = source
    .filter((week) => week.entries.length)
    .map((week) => {
      const dateByDay = new Map<number, { label: string; date: string }>(getActivityPlanDates(week.weekNumber).map((date) => [date.dayOfWeek, { label: date.label, date: date.date }]));
      return {
        weekNumber: week.weekNumber,
        dateRange: week.dates.length ? `${week.dates[0].date} — ${week.dates[week.dates.length - 1].date}` : "",
        entries: week.entries.map((entry, entryIndex) => ({
          id: `${week.weekNumber}-${entry.dayOfWeek}-${entry.periodNumber}-${entryIndex}`,
          week: String(week.weekNumber),
          day: dateByDay.get(entry.dayOfWeek)?.label || `اليوم ${entry.dayOfWeek}`,
          date: dateByDay.get(entry.dayOfWeek)?.date || "",
          period: getPeriodLabel(entry.periodNumber),
          activityArea: getActivityPlanProgramByKey(entry.programKey)?.title || "نشاط طلابي",
          activity: getActivityPlanProgramByKey(entry.programKey)?.title || "نشاط طلابي",
          grade: entry.gradeLabel,
          supervisor: entry.teacherName,
        })),
      };
    });

  const rows = populatedWeeks.flatMap((week) => week.entries);
  const profile = await prisma.schoolProfile.findUnique({ where: { schoolAccountId }, select: { academicYear: true, currentSemester: true } });
  const share = await getOrCreateActivityPlanShareToken({ schoolAccountId, createdById: ownerUserId });
  const shareUrl = share.url;
  const shareQrDataUrl = await QRCode.toDataURL(shareUrl, { width: 180, margin: 2, errorCorrectionLevel: "M" });
  const activityAreas = Array.from(new Set(rows.map((row) => row.activityArea).filter(Boolean)));

  return {
    id: link.id,
    serviceSlug: link.serviceSlug,
    resourceType: link.resourceType,
    performanceItemKey: link.performanceItemKey,
    targetSectionKey: link.targetSectionKey || link.performanceItemKey,
    displayTitle: link.displayTitle,
    createdAt: link.createdAt.toISOString(),
    content: {
      kind: "activity-plan",
      title: "خطة النشاط الطلابي",
      academicYear: profile?.academicYear || "",
      semester: profile?.currentSemester || "",
      totalWeeks: 20,
      populatedWeeks: populatedWeeks.length,
      totalEntries: rows.length,
      activityAreas,
      rows,
      shareUrl,
      shareQrDataUrl,
    },
  };
}
