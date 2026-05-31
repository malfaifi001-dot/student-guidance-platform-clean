import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  try {
    const { reportId } = await context.params;
    const body = await request.json();

    const report = await prisma.guidanceReport.findUnique({
      where: {
        id: reportId,
      },
      select: {
        id: true,
        status: true,
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
            reportId,
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
        reportId,
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
