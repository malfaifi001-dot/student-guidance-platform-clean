import { NextResponse } from "next/server";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { getOrCreateActivityPlanShareToken, revokeActivityPlanShareTokens } from "@/lib/activity-plan/activity-plan-share-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorize() {
  const auth = await requireSchoolDashboardApiContext({ allowPrincipal: true });
  if (auth instanceof Response) return auth;
  const access = await requireServiceAccessApi("student-activity-plan", { allowPrincipal: true });
  if (access) return access;
  if (auth.user.role !== "ACTIVITY_LEADER" && auth.user.role !== "ADMIN") return NextResponse.json({ error: "الخدمة غير متاحة لهذا الدور." }, { status: 403 });
  return auth;
}

export async function GET() {
  const auth = await authorize();
  if (auth instanceof Response) return auth;
  const share = await getOrCreateActivityPlanShareToken({ schoolAccountId: auth.schoolAccountId, createdById: auth.user.id });
  return NextResponse.json({ url: share.url });
}

export async function POST() {
  return GET();
}

export async function DELETE() {
  const auth = await authorize();
  if (auth instanceof Response) return auth;
  await revokeActivityPlanShareTokens({ schoolAccountId: auth.schoolAccountId });
  return NextResponse.json({ ok: true });
}
