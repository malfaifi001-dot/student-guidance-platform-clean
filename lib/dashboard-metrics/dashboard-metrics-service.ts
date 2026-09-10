import { prisma } from "@/lib/prisma";
import { countIssuedReportsForCaseScope } from "@/lib/statistics/statistics-issued-report-source";

export type SchoolDashboardMetrics = {
  students: number;
  cases: number;
  reports: number;
  evidences: number;
  draftCases: number;
  readyForReport: number;
  upcomingReminders: number;
};

/**
 * Shared dashboard metrics. Students and operational items remain scoped to
 * the current school. When ownerUserId is supplied, case-derived metrics use
 * the durable CaseEntry.createdById owner instead, so personal work survives
 * a school-account transfer. Omit ownerUserId for school-wide callers.
 */
export async function getSchoolDashboardMetrics(
  schoolAccountId: string,
  now = new Date(),
  ownerUserId?: string,
): Promise<SchoolDashboardMetrics> {
  const nextSevenDays = new Date(now);
  nextSevenDays.setDate(nextSevenDays.getDate() + 7);

  const caseScope = ownerUserId
    ? { createdById: ownerUserId }
    : { schoolAccountId };

  const [
    students,
    cases,
    reports,
    workflowEvidence,
    caseEvidence,
    reportEvidence,
    draftCases,
    readyForReport,
    upcomingReminders,
  ] = await Promise.all([
    prisma.student.count({
      where: { schoolAccountId, isActive: true },
    }),
    prisma.caseEntry.count({
      where: { ...caseScope, status: { not: "ARCHIVED" } },
    }),
    countIssuedReportsForCaseScope(caseScope),
    prisma.evidence.count({
      where: { caseEntry: { schoolAccountId } },
    }),
    prisma.caseEvidence.count({
      where: { caseEntry: { schoolAccountId } },
    }),
    prisma.reportEvidence.count({
      where: { report: { caseEntry: { schoolAccountId } } },
    }),
    prisma.caseEntry.count({
      where: { ...caseScope, status: "DRAFT" },
    }),
    prisma.caseEntry.count({
      where: {
        ...caseScope,
        status: "SUBMITTED",
        guidanceReports: { none: {} },
      },
    }),
    prisma.calendarReminder.count({
      where: {
        schoolAccountId,
        status: "PENDING",
        scheduledAt: { gte: now, lte: nextSevenDays },
      },
    }),
  ]);

  return {
    students,
    cases,
    reports,
    evidences: workflowEvidence + caseEvidence + reportEvidence,
    draftCases,
    readyForReport,
    upcomingReminders,
  };
}
