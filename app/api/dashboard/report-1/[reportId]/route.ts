import { NextResponse } from "next/server";
import { ReportStatus } from "@prisma/client";

import { requireDashboardApiContext } from "@/lib/auth/dashboard-context";
import { prisma } from "@/lib/prisma";
import { buildReportAccessWhere } from "@/lib/reports/report-access";
import { addApprovedEditorialMeta } from "@/lib/reports/report-editorial-content";

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
        userId: authResult.user.id,
        userRole: authResult.user.role,
      }),
      select: {
        id: true,
        status: true,
        title: true,
        editableContent: true,
        renderedContent: true,
        approvedAt: true,
        caseEntryId: true,
        serviceSlug: true,
        caseEntry: { select: { schoolAccountId: true } },
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

    if (existingReport.status === ReportStatus.ARCHIVED) {
      return NextResponse.json(
        {
          success: false,
          code: "REPORT_ARCHIVED",
          error: "لا يمكن تعديل تقرير مؤرشف قبل استعادته.",
        },
        { status: 409 },
      );
    }

    if (title.length > 190) {
      return NextResponse.json(
        { success: false, error: "يجب ألا يتجاوز عنوان التقرير 190 حرفًا." },
        { status: 400 },
      );
    }

    const requestedContent = JSON.stringify(documentDraft);
    const titleChanged = title !== existingReport.title;
    const editableContentChanged = requestedContent !== existingReport.editableContent;
    const renderedContentChanged = requestedContent !== (existingReport.renderedContent || "");
    const hasChanges = titleChanged || editableContentChanged || renderedContentChanged;
    const approved = existingReport.status === ReportStatus.APPROVED;
    const editedAt = new Date().toISOString();
    const editableContent = approved && hasChanges
      ? addApprovedEditorialMeta({
          editableContent: requestedContent,
          actorUserId: authResult.user.id,
          editedAt,
        })
      : requestedContent;

    const updated = hasChanges
      ? await prisma.$transaction(async (tx) => {
          const saved = await tx.guidanceReport.update({
            where: { id: existingReport.id },
            data: {
              title,
              editableContent,
              renderedContent: requestedContent,
            },
            select: {
              id: true,
              title: true,
              status: true,
              approvedAt: true,
              updatedAt: true,
            },
          });

          await tx.platformActivityLog.create({
            data: {
              actorUserId: authResult.user.id,
              schoolAccountId: existingReport.caseEntry.schoolAccountId,
              category: "REPORT",
              action: approved ? "APPROVED_REPORT_EDITED" : "REPORT_EDITED",
              severity: "INFO",
              title: approved ? "تم تعديل تقرير بعد الاعتماد" : "تم تعديل تقرير",
              details: {
                reportId: existingReport.id,
                caseEntryId: existingReport.caseEntryId,
                serviceSlug: existingReport.serviceSlug,
                reportTitle: title,
                reportStatus: existingReport.status,
                actorUserId: authResult.user.id,
                changedSections: [
                  ...(titleChanged ? ["title"] : []),
                  ...(editableContentChanged ? ["editableContent"] : []),
                  ...(renderedContentChanged ? ["renderedContent"] : []),
                ],
                titleChanged,
                editableContentChanged,
                renderedContentChanged,
                evidencePresentationChanged: false,
                editedAt,
              },
            },
          });

          return saved;
        })
      : await prisma.guidanceReport.findUniqueOrThrow({
          where: { id: existingReport.id },
          select: {
            id: true,
            title: true,
            status: true,
            approvedAt: true,
            updatedAt: true,
          },
        });

    return NextResponse.json({
      success: true,
      message: approved
        ? "تم حفظ تعديلات التقرير المعتمد."
        : "تم حفظ تعديلات التقرير.",
      report: {
        ...updated,
        approvedAt: updated.approvedAt?.toISOString() || null,
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
