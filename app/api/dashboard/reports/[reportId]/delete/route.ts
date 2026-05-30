import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ReportStatus } from "@prisma/client";

type RouteContext = {
  params: Promise<{
    reportId: string;
  }>;
};

async function archiveReport(reportId: string) {
  const existingReport = await prisma.guidanceReport.findUnique({
    where: {
      id: reportId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!existingReport) {
    return {
      ok: false,
      status: 404,
      error: "التقرير غير موجود.",
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
      id: reportId,
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
  try {
    const { reportId } = await context.params;

    if (!reportId) {
      return NextResponse.json(
        {
          success: false,
          error: "reportId مطلوب لأرشفة التقرير.",
        },
        { status: 400 }
      );
    }

    const result = await archiveReport(reportId);

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