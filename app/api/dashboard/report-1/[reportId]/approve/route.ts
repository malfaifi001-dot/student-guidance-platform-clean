import { NextResponse } from "next/server";
import { ReportStatus } from "@prisma/client";

import { requireDashboardApiContext } from "@/lib/auth/dashboard-context";
import { prisma } from "@/lib/prisma";
import { buildReportAccessWhere } from "@/lib/reports/report-access";

type RouteContext = {
  params: Promise<{
    reportId: string;
  }>;
};

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
      },
      { status: 403 },
    );
  }

  try {
    const { reportId } = await context.params;

    const existingReport = await prisma.guidanceReport.findFirst({
      where: buildReportAccessWhere(reportId, {
        schoolAccountId: authResult.schoolAccountId,
        isAdmin: authResult.isAdmin,
        userId: authResult.user.id,
        userRole: authResult.user.role,
      }),
      select: {
        id: true,
        status: true,
        caseEntryId: true,
        serviceSlug: true,
        caseEntry: {
          select: {
            schoolAccountId: true,
          },
        },
      },
    });

    if (!existingReport) {
      return NextResponse.json(
        {
          success: false,
          error: "التقرير غير موجود أو لا تملك صلاحية الوصول إليه.",
        },
        { status: 404 },
      );
    }

    if (existingReport.status === ReportStatus.ARCHIVED) {
      return NextResponse.json(
        {
          success: false,
          error: "لا يمكن اعتماد تقرير مؤرشف.",
        },
        { status: 400 },
      );
    }

    if (existingReport.status === ReportStatus.APPROVED) {
      return NextResponse.json({
        success: true,
        alreadyApproved: true,
        message: "التقرير معتمد مسبقًا.",
      });
    }

    const report = await prisma.guidanceReport.update({
      where: {
        id: existingReport.id,
      },
      data: {
        status: ReportStatus.APPROVED,
        approvedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        approvedAt: true,
      },
    });

    await prisma.platformActivityLog
      .create({
        data: {
          actorUserId: authResult.user.id,
          schoolAccountId: existingReport.caseEntry.schoolAccountId,
          category: "REPORTS",
          action: "APPROVE_REPORT_ONE",
          severity: "INFO",
          title: "اعتماد تقرير report-1",
          details: {
            reportId: report.id,
            caseEntryId: existingReport.caseEntryId,
            serviceSlug: existingReport.serviceSlug,
          },
        },
      })
      .catch(() => null);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("REPORT_ONE_APPROVE_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "تعذر اعتماد التقرير.",
      },
      { status: 500 },
    );
  }
}
