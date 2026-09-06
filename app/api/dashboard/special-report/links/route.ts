import { NextResponse } from "next/server";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { getApprovedSpecialReportCase, getSpecialReportLink, listSpecialReportLinkTargets, requireSpecialReportLinkAccess, saveSpecialReportLink, type SpecialReportLinkRole } from "@/lib/special-report/report-linking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown) { return String(value ?? "").trim(); }

async function access() {
  const auth = await requireSchoolDashboardApiContext({ allowPrincipal: false });
  if (auth instanceof Response) return auth;
  try { return await requireSpecialReportLinkAccess(auth.user.id, auth.user.role, auth.schoolAccountId); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر التحقق من الصلاحية." }, { status: 403 }); }
}

export async function GET(request: Request) {
  const auth = await access();
  if (auth instanceof Response) return auth;
  const caseId = clean(new URL(request.url).searchParams.get("caseId"));
  if (!caseId) return NextResponse.json({ error: "معرف التقرير مطلوب." }, { status: 400 });
  const source = await getApprovedSpecialReportCase(caseId, auth.userId, auth.schoolAccountId);
  if (!source) return NextResponse.json({ error: "التقرير غير موجود أو غير معتمد." }, { status: 404 });
  return NextResponse.json({ targets: await listSpecialReportLinkTargets(auth.role, auth.userId, auth.schoolAccountId), link: await getSpecialReportLink(caseId, auth.role, auth.schoolAccountId) });
}

export async function POST(request: Request) {
  const auth = await access();
  if (auth instanceof Response) return auth;
  let body: Record<string, unknown> = {}; try { body = await request.json() as Record<string, unknown>; } catch { /* invalid JSON */ }
  const caseId = clean(body.caseId); const targetId = clean(body.targetId) || null;
  if (!caseId) return NextResponse.json({ error: "معرف التقرير مطلوب." }, { status: 400 });
  try {
    await saveSpecialReportLink({ caseId, role: auth.role as SpecialReportLinkRole, userId: auth.userId, schoolAccountId: auth.schoolAccountId, targetId });
    return NextResponse.json({ ok: true, link: await getSpecialReportLink(caseId, auth.role, auth.schoolAccountId) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر حفظ الربط." }, { status: 400 }); }
}
