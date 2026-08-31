import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ReportStatus } from "@prisma/client";
import { requireDashboardApiContext } from "@/lib/auth/dashboard-context";
import { buildReportAccessWhere } from "@/lib/reports/report-access";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { getActivityProgramsBillingServiceSlug } from "@/lib/activity-programs/activity-program-catalog";

type RouteContext = {
  params: Promise<{
    reportId: string;
  }>;
};

async function archiveReport(
  reportId: string,
  scope: {
    schoolAccountId: string | null;
    isAdmin: boolean;
    userId: string;
    userRole: string;
  },
) {
  const existingReport = await prisma.guidanceReport.findFirst({
    where: buildReportAccessWhere(reportId, scope),
    select: {
      id: true,
      status: true,
    },
  });

  if (!existingReport) {
    return {
      ok: false,
      status: 404,
      error: "التقارير غير موجود أو لا تملك صلاحية الوصول إليه.",
    };
  }

  if (existingReport.status === ReportStatus.ARCHIVED) {
    return {
      ok: true,
      status: 200,
      report: existingReport,
    };
  }

  const report = await prisma.guidanceReport.update({
    where: {
      id: existingReport.id,
    },
    data: {
      status: ReportStatus.ARCHIVED,
      archivedAt: new Date(),
    },
    select: {
      id: true,
      status: true,
      archivedAt: true,
    },
  });

  return {
    ok: true,
    status: 200,
    report,
  };
}

export async function POST(_request: Request, context: RouteContext) {
  const authResult = await requireDashboardApiContext();

  if (authResult instanceof Response) {
    return authResult;
  }

  if (!authResult.isAdmin && !authResult.schoolAccountId) {
    return NextResponse.json(
      {
        success: false,
        error: "لم يتم ربط الحساب بمدرسة.",
        code: "SCHOOL_ACCOUNT_REQUIRED",
      },
      { status: 403 },
    );
  }

  try {
    const { reportId } = await context.params;

    const result = await archiveReport(reportId, {
      schoolAccountId: authResult.schoolAccountId,
      isAdmin: authResult.isAdmin,
      userId: authResult.user.id,
      userRole: authResult.user.role,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: result.status },
      );
    }

    return NextResponse.json({
      success: true,
      report: result.report,
    });
  } catch (error) {
    console.error("archive report error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "تعذر أرشفة التقارير.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireDashboardApiContext();
  if (authResult instanceof Response) return authResult;
  if (!authResult.isAdmin && !authResult.schoolAccountId) {
    return NextResponse.json(
      {
        success: false,
        code: "SCHOOL_ACCOUNT_REQUIRED",
        error: "لم يتم ربط الحساب بمدرسة.",
      },
      { status: 403 },
    );
  }

  try {
    const { reportId } = await context.params;
    const report = await prisma.guidanceReport.findFirst({
      where: buildReportAccessWhere(reportId, {
        schoolAccountId: authResult.schoolAccountId,
        isAdmin: authResult.isAdmin,
        userId: authResult.user.id,
        userRole: authResult.user.role,
      }),
      select: {
        id: true,
        title: true,
        status: true,
        approvedAt: true,
        caseEntryId: true,
        serviceSlug: true,
        caseEntry: { select: { schoolAccountId: true } },
      },
    });
    if (!report)
      return NextResponse.json(
        {
          success: false,
          error: "التقرير غير موجود أو لا تملك صلاحية الوصول إليه.",
        },
        { status: 404 },
      );
    const serviceGuard = await requireServiceAccessApi(
      getActivityProgramsBillingServiceSlug(report.serviceSlug),
    );
    if (serviceGuard) return serviceGuard;
    const deletedAt = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.platformActivityLog.create({
        data: {
          actorUserId: authResult.user.id,
          schoolAccountId: report.caseEntry.schoolAccountId,
          category: "REPORT",
          action:
            report.status === ReportStatus.APPROVED
              ? "APPROVED_REPORT_DELETED"
              : "REPORT_DELETED",
          severity: "WARNING",
          title:
            report.status === ReportStatus.APPROVED
              ? "تم حذف تقرير معتمد"
              : "تم حذف تقرير",
          details: {
            reportId: report.id,
            caseEntryId: report.caseEntryId,
            serviceSlug: report.serviceSlug,
            reportTitle: report.title,
            reportStatus: report.status,
            actorUserId: authResult.user.id,
            approvedAt: report.approvedAt?.toISOString() || null,
            deletedAt: deletedAt.toISOString(),
          },
        },
      });
      await tx.dashboardResourceLink.deleteMany({
        where: { OR: [{ sourceId: report.id }, { targetId: report.id }] },
      });
      await tx.guidanceReport.delete({ where: { id: report.id } });
    });
    return NextResponse.json({
      success: true,
      message: "تم حذف التقرير بنجاح.",
      deletedReport: {
        id: report.id,
        caseEntryId: report.caseEntryId,
        status: report.status,
        title: report.title,
      },
    });
  } catch (error) {
    console.error("delete report error:", error);
    return NextResponse.json(
      { success: false, error: "تعذر حذف التقرير." },
      { status: 500 },
    );
  }
}
