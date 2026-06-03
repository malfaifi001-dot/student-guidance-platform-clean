import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveSubscriptionApi } from "@/lib/subscription/subscription-api-guard";
import { requireDashboardApiContext } from "@/lib/auth/dashboard-context";
import { buildReportAccessWhere } from "@/lib/reports/report-access";

type RouteContext = {
  params: Promise<{
    reportId: string;
  }>;
};

type EvidencePayloadItem = {
  id?: unknown;
  caption?: unknown;
  visible?: unknown;
  sortOrder?: unknown;
};

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
        code: "SCHOOL_ACCOUNT_REQUIRED",
      },
      { status: 403 }
    );
  }

  const subscriptionGuard = await requireActiveSubscriptionApi();
  if (subscriptionGuard) return subscriptionGuard;

  try {
    const { reportId } = await context.params;
    const body = await request.json();

    const report = await prisma.guidanceReport.findFirst({
      where: buildReportAccessWhere(reportId, {
        schoolAccountId: authResult.schoolAccountId,
        isAdmin: authResult.isAdmin,
      }),
      select: {
        id: true,
        status: true,
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

    if (report.status === "APPROVED" || report.status === "ARCHIVED") {
      return NextResponse.json(
        {
          success: false,
          error: "لا يمكن تعديل شواهد تقرير معتمد أو مؤرشف.",
        },
        { status: 403 }
      );
    }

    const items = Array.isArray(body?.items)
      ? (body.items as EvidencePayloadItem[])
      : [];

    if (!items.length) {
      return NextResponse.json(
        {
          success: false,
          error: "لا توجد شواهد لتحديثها.",
        },
        { status: 400 }
      );
    }

    const normalizedItems = items
      .map((item, index) => ({
        id: typeof item.id === "string" ? item.id : "",
        caption:
          typeof item.caption === "string"
            ? item.caption.trim()
            : item.caption === null
              ? ""
              : "",
        visible:
          typeof item.visible === "boolean" ? item.visible : true,
        sortOrder:
          typeof item.sortOrder === "number" && Number.isFinite(item.sortOrder)
            ? item.sortOrder
            : index,
      }))
      .filter((item) => item.id);

    if (!normalizedItems.length) {
      return NextResponse.json(
        {
          success: false,
          error: "بيانات الشواهد غير صحيحة.",
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(
      normalizedItems.map((item, index) =>
        prisma.reportEvidence.updateMany({
          where: {
            id: item.id,
            reportId: report.id,
          },
          data: {
            caption: item.caption,
            visible: item.visible,
            sortOrder: item.sortOrder ?? index,
          },
        })
      )
    );

    const evidenceItems = await prisma.reportEvidence.findMany({
      where: {
        reportId: report.id,
      },
      orderBy: {
        sortOrder: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      evidenceItems,
    });
  } catch (error) {
    console.error("REPORT_EVIDENCE_UPDATE_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        error: "حدث خطأ أثناء تحديث شواهد التقرير.",
      },
      { status: 500 }
    );
  }
}
