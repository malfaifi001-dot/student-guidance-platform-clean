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

function toRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, any>;
}

export async function PATCH(request: Request, context: RouteContext) {
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
    const body = toRecord(await request.json().catch(() => ({})));
    const documentDraft = toRecord(body.documentDraft);

    const title =
      String(body.title || documentDraft.title || "").trim() ||
      "تقرير حالة";

    const existingReport = await prisma.guidanceReport.findFirst({
      where: buildReportAccessWhere(reportId, {
        schoolAccountId: authResult.schoolAccountId,
        isAdmin: authResult.isAdmin,
      }),
      select: {
        id: true,
        status: true,
        reportDataSnapshot: true,
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

    if (existingReport.status === ReportStatus.APPROVED) {
      return NextResponse.json(
        {
          success: false,
          error: "لا يمكن تعديل تقرير معتمد.",
        },
        { status: 403 },
      );
    }

    const currentSnapshot =
      existingReport.reportDataSnapshot &&
      typeof existingReport.reportDataSnapshot === "object" &&
      !Array.isArray(existingReport.reportDataSnapshot)
        ? (existingReport.reportDataSnapshot as Record<string, any>)
        : {};

    const updated = await prisma.guidanceReport.update({
      where: {
        id: existingReport.id,
      },
      data: {
        title,
        editableContent: JSON.stringify(documentDraft),
        renderedContent: JSON.stringify(documentDraft),
        reportDataSnapshot: {
          ...currentSnapshot,
          documentDraft,
          savedAt: new Date().toISOString(),
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      report: {
        ...updated,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("REPORT_ONE_UPDATE_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "تعذر حفظ تعديلات التقرير.",
      },
      { status: 500 },
    );
  }
}