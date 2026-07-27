import { NextResponse } from "next/server";

import { requireDashboardApiContext } from "@/lib/auth/dashboard-context";
import { createReportTwoSnapshot } from "@/lib/report-2/report-snapshot-service";
import { getAuthorizedReportTwoCase } from "@/lib/report-2/report-two-access";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { getActivityProgramsBillingServiceSlug } from "@/lib/activity-programs/activity-program-catalog";

type RouteContext = {
  params: Promise<{
    caseId: string;
  }>;
};

async function readBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const dashboardContext = await requireDashboardApiContext();

    if (dashboardContext instanceof NextResponse) {
      return dashboardContext;
    }

    const { caseId } = await context.params;
    const caseEntry = await getAuthorizedReportTwoCase(
      dashboardContext,
      caseId,
      "REPORT_APPROVE",
    );
    if (!caseEntry) {
      return NextResponse.json({ error: "الحالة غير موجودة أو لا تملك صلاحية اعتماد تقريرها." }, { status: 404 });
    }
    const serviceGuard = await requireServiceAccessApi(
      getActivityProgramsBillingServiceSlug(caseEntry.service.slug),
    );
    if (serviceGuard) return serviceGuard;
    const body = await readBody(request);

    const result = await createReportTwoSnapshot(dashboardContext, {
      caseId,
      reportTitle: body.reportTitle,
      templateId: body.templateId,
      templateName: body.templateName,
      variantId: body.variantId,
      snapshotPayload: body.snapshotPayload || {},
      snapshotTemplateJson: body.snapshotTemplateJson || null,
      snapshotPagesJson: body.snapshotPagesJson || null,
      snapshotHtml: body.snapshotHtml,
      pdfUrl: body.pdfUrl || null,
      editorState: body.editorState || null,
      approvedEditConfirmed: body.approvedEditConfirmed === true,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.message,
        },
        {
          status: result.status,
        },
      );
    }

    return NextResponse.json({
      snapshot: result.snapshot,
      previewUrl: `/dashboard/report-2/snapshots/${result.snapshot.id}/preview`,
    });
  } catch (error) {
    console.error("report-2 approval failed:", error);

    return NextResponse.json(
      {
        error: "تعذر اعتماد التقرير بسبب خطأ في الخادم.",
        details: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      },
    );
  }
}
