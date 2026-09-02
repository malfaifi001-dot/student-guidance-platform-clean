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
 * Shared school-scoped dashboard metrics. The counts intentionally use the
 * business records, not activity-log events, and exclude archived records.
 */
export async function getSchoolDashboardMetrics(
  schoolAccountId: string,
  now = new Date(),
): Promise<SchoolDashboardMetrics> {
  const nextSevenDays = new Date(now);
  nextSevenDays.setDate(nextSevenDays.getDate() + 7);

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
      where: { schoolAccountId, status: { not: "ARCHIVED" } },
    }),
    countIssuedReportsForCaseScope({ schoolAccountId }),
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
      where: { schoolAccountId, status: "DRAFT" },
    }),
    prisma.caseEntry.count({
      where: {
        schoolAccountId,
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
