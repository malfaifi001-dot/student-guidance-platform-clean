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

async function archiveReport(reportId: string, scope: {
  schoolAccountId: string | null;
  isAdmin: boolean;
}) {
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
      error: "التقرير غير موجود أو لا تملك صلاحية الوصول إليه.",
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
      { status: 403 }
    );
  }

  try {
    const { reportId } = await context.params;

    const result = await archiveReport(reportId, {
      schoolAccountId: authResult.schoolAccountId,
      isAdmin: authResult.isAdmin,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: result.status }
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
        error:
          error instanceof Error ? error.message : "تعذر أرشفة التقرير.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  return POST(_request, context);
}
