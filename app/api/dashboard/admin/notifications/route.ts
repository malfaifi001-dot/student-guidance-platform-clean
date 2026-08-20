import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import {
  createPushCampaign,
  getAutomaticRules,
  getPushOverview,
  listPushCampaigns,
  type CreatePushCampaignInput,
} from "@/lib/notifications/push-center-service";

export const runtime = "nodejs";

const SAFE_INPUT_ERRORS = new Set([
  "INVALID_AUDIENCE_TYPE", "INVALID_AUDIENCE_ROLE", "MISSING_AUDIENCE_USER", "INVALID_AUDIENCE_USERS", "MISSING_AUDIENCE_SCHOOL",
  "INVALID_PUSH_TITLE", "INVALID_PUSH_BODY", "INVALID_PUSH_ROUTE", "MISSING_SCHEDULE_DATE", "INVALID_SCHEDULE_DATE", "RECURRING_REQUIRES_SCHEDULE", "RECURRENCE_REQUIRES_FREQUENCY",
]);

export async function GET() {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;
  const [overview, campaigns, rules] = await Promise.all([getPushOverview(), listPushCampaigns(), getAutomaticRules()]);
  return NextResponse.json({ overview, campaigns, rules });
}

export async function POST(request: Request) {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;
  const current = await getCurrentSessionUser();
  if (!current?.user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  try {
    const input = await request.json() as CreatePushCampaignInput;
    const campaign = await createPushCampaign(input, current.user.id);
    return NextResponse.json({ ok: true, campaign }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error && SAFE_INPUT_ERRORS.has(error.message) ? error.message : "PUSH_CAMPAIGN_CREATE_FAILED";
    return NextResponse.json({ ok: false, error: { code } }, { status: SAFE_INPUT_ERRORS.has(code) ? 400 : 503 });
  }
}
