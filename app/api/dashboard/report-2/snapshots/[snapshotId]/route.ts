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
    const dashboardContext = await requireDashboardApiContext({ allowPrincipal: true });

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
    { allowPrincipal: true },
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
  const dashboardContext = await requireDashboardApiContext({ allowPrincipal: true });
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
  // Historical owner reads may cross a school transfer, but destructive
  // report operations remain restricted to the current tenant context.
  if (
    !dashboardContext.isAdmin &&
    authorized.caseEntry.schoolAccountId !== dashboardContext.schoolAccountId
  ) {
    return NextResponse.json(
      { success: false, error: "التقرير غير موجود." },
      { status: 404 },
    );
  }
  const active = authorized.kind === "ACTIVE" ? authorized.report : null;
  const historical = authorized.kind === "SNAPSHOT" ? authorized.report : null;
  const status = active?.status || "APPROVED";
  const title = active?.reportTitle || historical?.reportTitle || "تقرير";
  const approvedAt = active?.approvedAt || historical?.approvedAt || null;
  const deletedAt = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      const activeReport = active
        ? await tx.reportTwoActive.findFirst({
            where: {
              id: snapshotId,
              caseEntryId: authorized.caseEntry.id,
              schoolAccountId: authorized.caseEntry.schoolAccountId,
            },
            select: { id: true, status: true, approvedAt: true },
          })
        : null;
      const historicalReport = historical
        ? await tx.reportSnapshot.findFirst({
            where: {
              id: snapshotId,
              caseEntryId: authorized.caseEntry.id,
              OR: [
                { schoolAccountId: authorized.caseEntry.schoolAccountId },
                { schoolAccountId: null },
              ],
            },
            select: { id: true },
          })
        : null;

      if (!activeReport && !historicalReport) {
        throw new Error("REPORT_TWO_ALREADY_DELETED");
      }

      const ownedSnapshotIds = new Set<string>();
      if (historicalReport) ownedSnapshotIds.add(historicalReport.id);

      if (activeReport?.status === "APPROVED" && activeReport.approvedAt) {
        const approvalSnapshot = await tx.reportSnapshot.findFirst({
          where: {
            caseEntryId: authorized.caseEntry.id,
            approvedAt: activeReport.approvedAt,
            OR: [
              { schoolAccountId: authorized.caseEntry.schoolAccountId },
              { schoolAccountId: null },
            ],
          },
          select: { id: true },
        });
        if (approvalSnapshot) ownedSnapshotIds.add(approvalSnapshot.id);
      }

      const reportOwnedIds = Array.from(
        new Set([snapshotId, ...ownedSnapshotIds]),
      );

      await tx.platformActivityLog.create({
        data: {
          actorUserId: dashboardContext.user.id,
          schoolAccountId: authorized.caseEntry.schoolAccountId,
          category: "REPORT",
          action:
            status === "APPROVED"
              ? "APPROVED_REPORT_DELETED"
              : "REPORT_DELETED",
          severity: "WARNING",
          title:
            status === "APPROVED" ? "تم حذف تقرير معتمد" : "تم حذف تقرير",
          details: {
            reportId: snapshotId,
            deletedSnapshotIds: Array.from(ownedSnapshotIds),
            caseEntryId: authorized.caseEntry.id,
            schoolAccountId: authorized.caseEntry.schoolAccountId,
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
        where: {
          OR: [
            { sourceId: { in: reportOwnedIds } },
            { targetId: { in: reportOwnedIds } },
          ],
        },
      });
      if (activeReport) {
        await tx.reportTwoActive.delete({ where: { id: activeReport.id } });
      }
      if (ownedSnapshotIds.size) {
        await tx.reportSnapshot.deleteMany({
          where: { id: { in: Array.from(ownedSnapshotIds) } },
        });
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "REPORT_TWO_ALREADY_DELETED") {
      return NextResponse.json(
        { success: false, code: "REPORT_ALREADY_DELETED", error: "تم حذف التقرير مسبقًا." },
        { status: 404 },
      );
    }
    console.error("REPORT_TWO_DELETE_FAILED", {
      reportId: snapshotId,
      caseEntryId: authorized.caseEntry.id,
      actorUserId: dashboardContext.user.id,
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
    });
    return NextResponse.json(
      { success: false, code: "REPORT_DELETE_FAILED", error: "تعذر حذف التقرير. حاول مرة أخرى." },
      { status: 500 },
    );
  }

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
