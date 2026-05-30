import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ReportStatus } from "@prisma/client";

type RouteContext = {
  params: Promise<{
    reportId: string;
  }>;
};

type UpdateReportBody = {
  title?: string;
  editableContent?: string;
  renderedContent?: string;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { reportId } = await context.params;

    if (!reportId) {
      return NextResponse.json(
        {
          success: false,
          error: "reportId مطلوب.",
        },
        { status: 400 }
      );
    }

    const report = await prisma.guidanceReport.findUnique({
      where: {
        id: reportId,
      },
      include: {
        evidenceItems: {
          orderBy: {
            sortOrder: "asc",
          },
        },
        caseEntry: {
          include: {
            service: true,
            student: {
              include: {
                guardian: true,
              },
            },
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json(
        {
          success: false,
          error: "التقرير غير موجود.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("get report error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "تعذر جلب بيانات التقرير.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { reportId } = await context.params;
    const body = (await request.json()) as UpdateReportBody;

    if (!reportId) {
      return NextResponse.json(
        {
          success: false,
          error: "reportId مطلوب لتحديث التقرير.",
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

    if (existingReport.status === ReportStatus.APPROVED) {
      return NextResponse.json(
        {
          success: false,
          error:
            "لا يمكن تعديل تقرير معتمد. يمكنك نسخ التقرير لإنشاء نسخة قابلة للتعديل.",
        },
        { status: 403 }
      );
    }

    if (existingReport.status === ReportStatus.ARCHIVED) {
      return NextResponse.json(
        {
          success: false,
          error: "لا يمكن تعديل تقرير مؤرشف.",
        },
        { status: 403 }
      );
    }

    const title = body.title?.trim();
    const editableContent = body.editableContent?.trim();
    const renderedContent = body.renderedContent?.trim();

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          error: "عنوان التقرير مطلوب.",
        },
        { status: 400 }
      );
    }

    if (!editableContent) {
      return NextResponse.json(
        {
          success: false,
          error: "محتوى التقرير لا يمكن أن يكون فارغًا.",
        },
        { status: 400 }
      );
    }

    const updatedReport = await prisma.guidanceReport.update({
      where: {
        id: reportId,
      },
      data: {
        title,
        editableContent,
        renderedContent: renderedContent || editableContent,
      },
      select: {
        id: true,
        title: true,
        status: true,
        editableContent: true,
        renderedContent: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      report: {
        ...updatedReport,
        updatedAt: updatedReport.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("update report error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "تعذر تحديث التقرير.",
      },
      { status: 500 }
    );
  }
}