import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveSubscriptionApi } from "@/lib/subscription/subscription-api-guard";
import { requireDashboardApiContext } from "@/lib/auth/dashboard-context";
import { buildReportAccessWhere } from "@/lib/reports/report-access";
import { addApprovedEditorialMeta } from "@/lib/reports/report-editorial-content";

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
        userId: authResult.user.id,
        userRole: authResult.user.role,
      }),
      select: {
        id: true,
        status: true,
        caseEntryId: true,
        serviceSlug: true,
        title: true,
        editableContent: true,
        caseEntry: { select: { schoolAccountId: true } },
      },
    });

    if (!report) {
      return NextResponse.json(
        {
          success: false,
          error: "التقارير غير موجود أو لا تملك صلاحية الوصول إليه.",
        },
        { status: 404 }
      );
    }

    if (report.status === "ARCHIVED") {
      return NextResponse.json(
        {
          success: false,
          code: "REPORT_ARCHIVED",
          error: "لا يمكن تعديل تقرير مؤرشف قبل استعادته.",
        },
        { status: 409 }
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
      .map((item: EvidencePayloadItem, index: number) => ({
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

    const uniqueIds = new Set(normalizedItems.map((item) => item.id));
    if (uniqueIds.size !== normalizedItems.length) {
      return NextResponse.json(
        { success: false, error: "تحتوي بيانات الشواهد على معرّفات مكررة." },
        { status: 400 },
      );
    }

    const existingItems = await prisma.reportEvidence.findMany({
      where: { reportId: report.id, id: { in: [...uniqueIds] } },
      select: { id: true, caption: true, visible: true, sortOrder: true },
    });

    if (existingItems.length !== normalizedItems.length) {
      return NextResponse.json(
        { success: false, error: "أحد الشواهد لا ينتمي إلى هذا التقرير." },
        { status: 400 },
      );
    }

    const currentById = new Map(existingItems.map((item) => [item.id, item]));
    const changedItems = normalizedItems.filter((item) => {
      const current = currentById.get(item.id);
      return Boolean(
        current &&
          ((current.caption || "") !== item.caption ||
            current.visible !== item.visible ||
            current.sortOrder !== item.sortOrder),
      );
    });

    if (changedItems.length) {
      const editedAt = new Date().toISOString();
      await prisma.$transaction([
        ...changedItems.map((item) =>
          prisma.reportEvidence.update({
            where: { id: item.id },
            data: {
              caption: item.caption,
              visible: item.visible,
              sortOrder: item.sortOrder,
            },
          }),
        ),
        ...(report.status === "APPROVED"
          ? [
              prisma.guidanceReport.update({
                where: { id: report.id },
                data: {
                  editableContent: addApprovedEditorialMeta({
                    editableContent: report.editableContent,
                    actorUserId: authResult.user.id,
                    editedAt,
                  }),
                },
              }),
            ]
          : []),
        prisma.platformActivityLog.create({
          data: {
            actorUserId: authResult.user.id,
            schoolAccountId: report.caseEntry.schoolAccountId,
            category: "REPORT",
            action:
              report.status === "APPROVED"
                ? "APPROVED_REPORT_EDITED"
                : "REPORT_EDITED",
            severity: "INFO",
            title:
              report.status === "APPROVED"
                ? "تم تعديل تقرير بعد الاعتماد"
                : "تم تعديل شواهد التقرير",
            details: {
              reportId: report.id,
              caseEntryId: report.caseEntryId,
              serviceSlug: report.serviceSlug,
              reportTitle: report.title,
              reportStatus: report.status,
              actorUserId: authResult.user.id,
              changedSections: ["evidencePresentation"],
              titleChanged: false,
              editableContentChanged: false,
              renderedContentChanged: false,
              evidencePresentationChanged: true,
              editedAt,
            },
          },
        }),
      ]);
    }

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
      message:
        report.status === "APPROVED"
          ? "تم حفظ تعديلات شواهد التقرير المعتمد."
          : "تم حفظ تعديلات الشواهد.",
      evidenceItems,
    });
  } catch (error) {
    console.error("REPORT_EVIDENCE_UPDATE_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        error: "حدث خطأ أثناء تحديث شواهد التقارير.",
      },
      { status: 500 }
    );
  }
}
