import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, ReportStatus } from "@prisma/client";
import { requireDashboardApiContext } from "@/lib/auth/dashboard-context";
import { buildReportAccessWhere } from "@/lib/reports/report-access";

type RouteContext = {
  params: Promise<{
    reportId: string;
  }>;
};

function cloneJsonValue(
  value: Prisma.JsonValue | null
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === null) {
    return Prisma.JsonNull;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function buildDuplicatedTitle(title: string) {
  const cleanTitle = title.trim();

  if (!cleanTitle) {
    return "نسخة من تقرير";
  }

  if (cleanTitle.startsWith("نسخة من")) {
    return cleanTitle;
  }

  return `نسخة من ${cleanTitle}`;
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

    const sourceReport = await prisma.guidanceReport.findFirst({
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
      },
    });

    if (!sourceReport) {
      return NextResponse.json(
        {
          success: false,
          error: "التقرير غير موجود أو لا تملك صلاحية الوصول إليه.",
        },
        { status: 404 }
      );
    }

    const duplicatedReport = await prisma.guidanceReport.create({
      data: {
        title: buildDuplicatedTitle(sourceReport.title),
        serviceSlug: sourceReport.serviceSlug,
        caseEntryId: sourceReport.caseEntryId,

        status: ReportStatus.DRAFT,

        genderMode: sourceReport.genderMode,
        editableContent: sourceReport.editableContent,
        renderedContent: sourceReport.renderedContent,

        evidenceEnabled: sourceReport.evidenceEnabled,

        templateId: sourceReport.templateId,
        templateSnapshot: cloneJsonValue(sourceReport.templateSnapshot),
        reportDataSnapshot: cloneJsonValue(sourceReport.reportDataSnapshot),

        generatedAt: new Date(),
        generatedPdfUrl: null,
        approvedAt: null,
        archivedAt: null,

        evidenceItems: {
          create: sourceReport.evidenceItems.map((item) => ({
            fileName: item.fileName,
            fileUrl: item.fileUrl,
            caption: item.caption,
            mimeType: item.mimeType,
            size: item.size,
            sortOrder: item.sortOrder,
            visible: item.visible,
          })),
        },
      },
      select: {
        id: true,
        title: true,
        templateId: true,
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      reportId: duplicatedReport.id,
      previewUrl: `/dashboard/reports/${duplicatedReport.id}/preview`,
      report: duplicatedReport,
    });
  } catch (error) {
    console.error("duplicate report error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "تعذر نسخ التقرير.",
      },
      { status: 500 }
    );
  }
}
