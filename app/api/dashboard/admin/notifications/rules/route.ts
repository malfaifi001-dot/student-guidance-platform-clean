import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { getAutomaticRules, updateAutomaticRule } from "@/lib/notifications/push-center-service";

export const runtime = "nodejs";

export async function GET() {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;
  return NextResponse.json({ rules: await getAutomaticRules() });
}

export async function PATCH(request: Request) {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;
  const current = await getCurrentSessionUser();
  const body = await request.json().catch(() => null);
  if (!current?.user || typeof body?.ruleId !== "string") return NextResponse.json({ ok: false, error: { code: "INVALID_RULE_INPUT" } }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, rule: await updateAutomaticRule(body.ruleId, body, current.user.id) });
  } catch {
    return NextResponse.json({ ok: false, error: { code: "RULE_UPDATE_FAILED" } }, { status: 503 });
  }
}
