import { notFound, redirect } from "next/navigation";

import { ReportStudioSavedPreview } from "@/components/reports/report-studio-editor";
import { prisma } from "@/lib/prisma";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import {
  getSchoolSubscriptionOverview,
  isServiceAllowedForSchool,
} from "@/lib/subscription/subscription-service";
import { buildGuidanceReportWhereForUser } from "@/lib/report-engine/report-access-scope";

type PageProps = {
  params: Promise<{
    reportId: string;
  }>;
};

export default async function SavedSmartReportPreviewRoute({
  params,
}: PageProps) {
  const current = await requireDashboardUser();

  if (current.user.role !== "ADMIN") {
    if (!current.user.schoolAccountId) {
      redirect("/dashboard/plans?reason=activation-required");
    }

    const overview = await getSchoolSubscriptionOverview(
      current.user.schoolAccountId,
    );

    if (!overview.usable) {
      redirect("/dashboard/plans?reason=activation-required");
    }
  }

  const resolvedParams = await params;
  const reportId = String(resolvedParams.reportId || "").trim();

  const report = await prisma.guidanceReport.findFirst({
    where: {
      id: reportId,
      ...buildGuidanceReportWhereForUser(current.user),
    },
    include: {
      caseEntry: {
        include: {
          service: true,
          student: { include: { guardian: true } },
          values: { include: { field: true } },
        },
      },
      evidenceItems: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!report) {
    notFound();
  }

  if (current.user.role !== "ADMIN") {
    const access = await isServiceAllowedForSchool({
      schoolAccountId: current.user.schoolAccountId || "",
      serviceSlug: report.serviceSlug,
    });

    if (!access.ok) {
      const reason =
        access.reason === "SUBSCRIPTION_INACTIVE"
          ? "activation-required"
          : "service-not-in-plan";

      redirect(
        `/dashboard/plans?reason=${reason}&service=${encodeURIComponent(
          report.serviceSlug,
        )}`,
      );
    }
  }

  return (
    <ReportStudioSavedPreview
      report={{
        id: report.id,
        title: report.title,
        serviceSlug: report.serviceSlug,
        status: String(report.status),
        genderMode: report.genderMode,
        templateId: report.templateId,
        hasTemplateSnapshot: Boolean(report.templateSnapshot),
        hasReportDataSnapshot: Boolean(report.reportDataSnapshot),
        templateSnapshot: report.templateSnapshot,
        reportDataSnapshot: report.reportDataSnapshot,
        editableContent: report.editableContent || "",
        renderedContent: report.renderedContent || "",
        createdAt: report.createdAt.toISOString(),
        updatedAt: report.updatedAt.toISOString(),
        generatedAt: report.generatedAt?.toISOString() || null,
        approvedAt: report.approvedAt?.toISOString() || null,
        archivedAt: report.archivedAt?.toISOString() || null,
        reportValues: report.caseEntry.values.map((value) => ({
          fieldKey: value.fieldKey,
          fieldLabel: value.field?.label || value.fieldKey,
          value: value.value ||
            (value.jsonValue === null ? "" : JSON.stringify(value.jsonValue)),
        })),
        evidenceItems: report.evidenceItems.map((item) => ({
          id: item.id,
          fileName: item.fileName,
          fileUrl: item.fileUrl,
          caption: item.caption,
          mimeType: item.mimeType,
          size: item.size,
          sortOrder: item.sortOrder,
          visible: item.visible,
          createdAt: item.createdAt.toISOString(),
        })),
        caseEntry: {
          id: report.caseEntry.id,
          title: report.caseEntry.title,
          status: String(report.caseEntry.status),
          createdAt: report.caseEntry.createdAt.toISOString(),
          service: {
            id: report.caseEntry.service.id,
            name: report.caseEntry.service.name,
            slug: report.caseEntry.service.slug,
          },
          student: report.caseEntry.student
            ? {
                id: report.caseEntry.student.id,
                fullName: report.caseEntry.student.fullName,
                nationalId: report.caseEntry.student.nationalId,
                stage: report.caseEntry.student.stage,
                grade: report.caseEntry.student.grade,
                classroom: report.caseEntry.student.classroom,
                guardianName: report.caseEntry.student.guardian?.name || null,
                guardianPhone: report.caseEntry.student.guardian?.phone || null,
              }
            : null,
        },
      }}
    />
  );
}
