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

type UpdateReportBody = {
  title?: string;
  editableContent?: string;
  renderedContent?: string;
};

function requireUsableReportContext(context: {
  isAdmin: boolean;
  schoolAccountId: string | null;
}) {
  if (!context.isAdmin && !context.schoolAccountId) {
    return NextResponse.json(
      {
        success: false,
        error: "لم يتم ربط الحساب بمدرسة.",
        code: "SCHOOL_ACCOUNT_REQUIRED",
      },
      { status: 403 }
    );
  }

  return null;
}

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireDashboardApiContext();

  if (authResult instanceof Response) {
    return authResult;
  }

  const contextError = requireUsableReportContext(authResult);
  if (contextError) return contextError;

  try {
    const { reportId } = await context.params;

    const report = await prisma.guidanceReport.findFirst({
      where: buildReportAccessWhere(reportId, {
        schoolAccountId: authResult.schoolAccountId,
        isAdmin: authResult.isAdmin,
      }),
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
          error: "التقرير غير موجود أو لا تملك صلاحية الوصول إليه.",
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
  const authResult = await requireDashboardApiContext();

  if (authResult instanceof Response) {
    return authResult;
  }

  const contextError = requireUsableReportContext(authResult);
  if (contextError) return contextError;

  try {
    const { reportId } = await context.params;
    const body = (await request.json()) as UpdateReportBody;

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
        id: existingReport.id,
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
