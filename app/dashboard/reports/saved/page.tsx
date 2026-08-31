import { redirect } from "next/navigation";

import { SavedReportsListPage } from "@/components/report-engine/saved-reports-list-page";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { getSchoolSubscriptionOverview } from "@/lib/subscription/subscription-service";
import { buildGuidanceReportWhereForUser } from "@/lib/report-engine/report-access-scope";

export default async function SavedReportsRoutePage() {
  const current = await requireDashboardUser();

  if (current.user.role !== "ADMIN") {
    if (!current.user.schoolAccountId) {
      redirect("/dashboard/plans?reason=activation-required");
    }

    const overview = await getSchoolSubscriptionOverview(
      current.user.schoolAccountId,
      current.user.id,
    );

    if (!overview.usable) {
      redirect("/dashboard/plans?reason=activation-required");
    }
  }

  const reports = await prisma.guidanceReport.findMany({
    where: buildGuidanceReportWhereForUser({
      ...current.user,
      historicalPersonalRead: true,
    }),
    include: {
      caseEntry: {
        include: {
          service: true,
          student: true,
        },
      },
    },
    orderBy: [
      {
        generatedAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    take: 80,
  });

  const safeReports = reports.map((report) => {
    if (
      current.user.schoolAccountId &&
      report.caseEntry?.schoolAccountId !== current.user.schoolAccountId
    ) {
      return { ...report, caseEntry: report.caseEntry ? { ...report.caseEntry, student: null } : null };
    }
    return report;
  });

  return (
    <SavedReportsListPage
      reports={safeReports.map((report) => ({
        id: report.id,
        title: report.title,
        status: report.status,
        serviceSlug: report.serviceSlug,
        generatedAt: report.generatedAt?.toISOString() || "",
        createdAt: report.createdAt.toISOString(),
        templateSnapshot: report.templateSnapshot,
        caseEntry: report.caseEntry
          ? {
              id: report.caseEntry.id,
              title: report.caseEntry.title,
              service: report.caseEntry.service
                ? {
                    name: report.caseEntry.service.name,
                    slug: report.caseEntry.service.slug,
                  }
                : null,
              student: report.caseEntry.student
                ? {
                    fullName: report.caseEntry.student.fullName,
                    grade: report.caseEntry.student.grade,
                    classroom: report.caseEntry.student.classroom,
                  }
                : null,
            }
          : null,
      }))}
    />
  );
}
