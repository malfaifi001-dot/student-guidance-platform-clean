import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ReportStatus } from "@prisma/client";
import { requireDashboardApiContext } from "@/lib/auth/dashboard-context";
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
        code: "SCHOOL_ACCOUNT_REQUIRED",
      },
      { status: 403 }
    );
  }

  try {
    const { reportId } = await context.params;

    const existingReport = await prisma.guidanceReport.findFirst({
      where: buildReportAccessWhere(reportId, {
        schoolAccountId: authResult.schoolAccountId,
        isAdmin: authResult.isAdmin,
      }),
      select: {
        id: true,
        status: true,
      },
    });

    if (!existingReport) {
      return NextResponse.json(
        {
          success: false,
          error: "التقرير غير موجود أو لا تملك صلاحية الوصول إليه.",
        },
        { status: 404 }
      );
    }

    if (existingReport.status === ReportStatus.ARCHIVED) {
      return NextResponse.json(
        {
          success: false,
          error: "لا يمكن اعتماد تقرير مؤرشف.",
        },
        { status: 400 }
      );
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

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("approve report error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "تعذر اعتماد التقرير.",
      },
      { status: 500 }
    );
  }
}
