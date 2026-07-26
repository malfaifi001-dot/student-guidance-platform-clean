import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ReportStatus} from "@prisma/client";
import { requireDashboardApiContext } from "@/lib/auth/dashboard-context";
import { buildReportAccessWhere } from "@/lib/reports/report-access";
import { addApprovedEditorialMeta } from "@/lib/reports/report-editorial-content";

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

const MAX_REPORT_TITLE_LENGTH = 190;

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
        userId: authResult.user.id,
        userRole: authResult.user.role,
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
          error: "التقارير غير موجود أو لا تملك صلاحية الوصول إليه.",
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
          error instanceof Error ? error.message : "تعذر جلب بيانات التقارير.",
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
        userId: authResult.user.id,
        userRole: authResult.user.role,
      }),
      select: {
        id: true,
        title: true,
        status: true,
        approvedAt: true,
        updatedAt: true,
        caseEntryId: true,
        serviceSlug: true,
        editableContent: true,
        renderedContent: true,
        caseEntry: { select: { schoolAccountId: true } },
      },
    });

    if (!existingReport) {
      return NextResponse.json(
        {
          success: false,
          error: "التقارير غير موجود أو لا تملك صلاحية الوصول إليه.",
        },
        { status: 404 }
      );
    }

    if (existingReport.status === ReportStatus.ARCHIVED) {
      return NextResponse.json(
        {
          success: false,
          code: "REPORT_ARCHIVED",
          error: "لا يمكن تعديل تقرير مؤرشف قبل استعادته.",
        },
        { status: 409 }
      );
    }

    if (
      typeof body.title !== "string" ||
      typeof body.editableContent !== "string" ||
      typeof body.renderedContent !== "string"
    ) {
      return NextResponse.json(
        { success: false, error: "بيانات تعديل التقرير غير صحيحة." },
        { status: 400 },
      );
    }

    const title = body.title.trim();
    const requestedEditableContent = body.editableContent;
    const renderedContent = body.renderedContent;

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          error: "عنوان التقارير مطلوب.",
        },
        { status: 400 }
      );
    }

    if (title.length > MAX_REPORT_TITLE_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: `يجب ألا يتجاوز عنوان التقرير ${MAX_REPORT_TITLE_LENGTH} حرفًا.`,
        },
        { status: 400 }
      );
    }

    if (!requestedEditableContent.trim()) {
      return NextResponse.json(
        { success: false, error: "محتوى التقرير لا يمكن أن يكون فارغًا." },
        { status: 400 },
      );
    }

    const titleChanged = title !== existingReport.title;
    const editableContentChanged =
      requestedEditableContent !== existingReport.editableContent;
    const renderedContentChanged =
      renderedContent !== (existingReport.renderedContent || "");
    const hasChanges = titleChanged || editableContentChanged || renderedContentChanged;
    const approved = existingReport.status === ReportStatus.APPROVED;
    const editedAt = new Date().toISOString();
    const editableContent = approved && hasChanges
      ? addApprovedEditorialMeta({
          editableContent: requestedEditableContent,
          actorUserId: authResult.user.id,
          editedAt,
        })
      : requestedEditableContent;

    const updatedReport = hasChanges
      ? await prisma.$transaction(async (tx) => {
          const updated = await tx.guidanceReport.update({
            where: { id: existingReport.id },
            data: { title, editableContent, renderedContent },
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

          return updated;
        })
      : {
          id: existingReport.id,
          title: existingReport.title,
          status: existingReport.status,
          approvedAt: existingReport.approvedAt,
          updatedAt: existingReport.updatedAt,
        };

    return NextResponse.json({
      success: true,
      message: approved
        ? "تم حفظ تعديلات التقرير المعتمد."
        : "تم حفظ تعديلات التقرير.",
      report: {
        ...updatedReport,
        approvedAt: updatedReport.approvedAt?.toISOString() || null,
        updatedAt: updatedReport.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("update report error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "تعذر تحديث التقارير.",
      },
      { status: 500 }
    );
  }
}
