import { NextResponse } from "next/server";
import { requireDashboardApiContext } from "@/lib/auth/dashboard-context";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { getActivityProgramsBillingServiceSlug } from "@/lib/activity-programs/activity-program-catalog";
import { getAuthorizedReportTwoCase } from "@/lib/report-2/report-two-access";
import { saveReportTwoActive } from "@/lib/report-2/report-snapshot-service";

type RouteContext = { params: Promise<{ caseId: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireDashboardApiContext();
  if (auth instanceof Response) return auth;
  const { caseId } = await context.params;
  const caseEntry = await getAuthorizedReportTwoCase(auth, caseId, "REPORT_EDIT");
  if (!caseEntry) {
    return NextResponse.json({ success: false, error: "الحالة غير موجودة أو لا تملك صلاحية تعديل تقريرها." }, { status: 404 });
  }
  const guard = await requireServiceAccessApi(
    getActivityProgramsBillingServiceSlug(caseEntry.service.slug),
  );
  if (guard) return guard;

  const body = await request.json().catch(() => ({}));
  const result = await saveReportTwoActive(auth, { caseId, ...body });
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.message }, { status: result.status });
  }
  return NextResponse.json({
    success: true,
    message: result.report.status === "APPROVED" ? "تم حفظ تعديلات التقرير المعتمد." : "تم حفظ التقرير.",
    report: result.report,
    previewUrl: `/dashboard/report-2/snapshots/${result.report.id}/preview`,
  });
}
