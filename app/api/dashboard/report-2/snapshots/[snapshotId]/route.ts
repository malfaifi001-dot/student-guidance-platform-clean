import { NextResponse } from "next/server";

import { requireDashboardApiContext } from "@/lib/auth/dashboard-context";
import { getReportTwoSnapshotById } from "@/lib/report-2/report-snapshot-service";
import { getAuthorizedReportTwoById } from "@/lib/report-2/report-two-access";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { getActivityProgramsBillingServiceSlug } from "@/lib/activity-programs/activity-program-catalog";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    snapshotId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const dashboardContext = await requireDashboardApiContext();

  if (dashboardContext instanceof NextResponse) {
    return dashboardContext;
  }

  const { snapshotId } = await context.params;
  const authorized = await getAuthorizedReportTwoById(
    dashboardContext,
    snapshotId,
    "REPORT_VIEW",
  );
  if (!authorized) {
    return NextResponse.json({ error: "التقرير غير موجود." }, { status: 404 });
  }
  const serviceGuard = await requireServiceAccessApi(
    getActivityProgramsBillingServiceSlug(authorized.caseEntry.service.slug),
  );
  if (serviceGuard) return serviceGuard;
  const snapshot = await getReportTwoSnapshotById(dashboardContext, snapshotId);

  if (!snapshot) {
    return NextResponse.json(
      {
        error: "التقرير المعتمد غير موجود.",
      },
      {
        status: 404,
      },
    );
  }

  return NextResponse.json({
    snapshot,
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const dashboardContext = await requireDashboardApiContext();
  if (dashboardContext instanceof NextResponse) return dashboardContext;
  const { snapshotId } = await context.params;
  const authorized = await getAuthorizedReportTwoById(
    dashboardContext,
    snapshotId,
    "REPORT_DELETE",
  );
  if (!authorized)
    return NextResponse.json(
      { success: false, error: "التقرير غير موجود." },
      { status: 404 },
    );
  const serviceGuard = await requireServiceAccessApi(
    getActivityProgramsBillingServiceSlug(authorized.caseEntry.service.slug),
  );
  if (serviceGuard) return serviceGuard;

  const active = authorized.kind === "ACTIVE" ? authorized.report : null;
  const historical = authorized.kind === "SNAPSHOT" ? authorized.report : null;
  const status = active?.status || "APPROVED";
  const title = active?.reportTitle || historical?.reportTitle || "تقرير";
  const approvedAt = active?.approvedAt || historical?.approvedAt || null;
  const deletedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.platformActivityLog.create({
      data: {
        actorUserId: dashboardContext.user.id,
        schoolAccountId: authorized.caseEntry.schoolAccountId,
        category: "REPORT",
        action:
          status === "APPROVED" ? "APPROVED_REPORT_DELETED" : "REPORT_DELETED",
        severity: "WARNING",
        title: status === "APPROVED" ? "تم حذف تقرير معتمد" : "تم حذف تقرير",
        details: {
          reportId: snapshotId,
          caseEntryId: authorized.caseEntry.id,
          serviceSlug: authorized.caseEntry.service.slug,
          reportTitle: title,
          reportStatus: status,
          actorUserId: dashboardContext.user.id,
          approvedAt: approvedAt?.toISOString() || null,
          deletedAt: deletedAt.toISOString(),
        },
      },
    });
    await tx.dashboardResourceLink.deleteMany({
      where: { OR: [{ sourceId: snapshotId }, { targetId: snapshotId }] },
    });
    await tx.reportTwoActive.deleteMany({
      where: {
        id: snapshotId,
        caseEntryId: authorized.caseEntry.id,
        schoolAccountId: authorized.caseEntry.schoolAccountId,
      },
    });
    await tx.reportSnapshot.deleteMany({
      where: {
        id: snapshotId,
        caseEntryId: authorized.caseEntry.id,
        OR: [
          { schoolAccountId: authorized.caseEntry.schoolAccountId },
          { schoolAccountId: null },
        ],
      },
    });
  });

  return NextResponse.json({
    success: true,
    message: "تم حذف التقرير بنجاح.",
    deletedReport: {
      id: snapshotId,
      caseEntryId: authorized.caseEntry.id,
      status,
      title,
    },
  });
}
