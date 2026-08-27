import { NextResponse } from "next/server";

import { requirePrincipalApi } from "@/lib/principal/principal-api-guard";
import { signApprovedPrincipalStaffReport, type PrincipalStaffReportSource } from "@/lib/principal/principal-report-signature-service";

type RouteContext = { params: Promise<{ userId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const access = await requirePrincipalApi();
  if (!access.ok) return access.response;
  const { userId } = await params;
  const body = (await request.json().catch(() => null)) as { source?: string; reportId?: string } | null;
  const source = body?.source;
  const reportId = String(body?.reportId || "").trim();
  if (!reportId || !["GUIDANCE_REPORT", "REPORT_SNAPSHOT", "REPORT_TWO"].includes(source || "")) {
    return NextResponse.json({ success: false, error: "بيانات التوقيع غير مكتملة." }, { status: 400 });
  }

  const result = await signApprovedPrincipalStaffReport({
    schoolAccountId: access.schoolAccountId!,
    principalUserId: access.user.id,
    staffUserId: userId,
    source: source as PrincipalStaffReportSource,
    reportId,
  });
  return NextResponse.json({ success: result.ok, ...result }, { status: result.ok ? 200 : result.status });
}
