import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ReportStatus } from "@prisma/client";

type RouteContext = {
  params: Promise<{
    reportId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { reportId } = await context.params;

    if (!reportId) {
      return NextResponse.json(
        {
          success: false,
          error: "reportId مطلوب لاعتماد التقرير.",
        },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        {
          success: false,
          error: "التقرير غير موجود.",
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
        id: reportId,
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