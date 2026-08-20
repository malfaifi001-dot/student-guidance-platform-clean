import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getPushAudienceEstimate, type PushAudienceInput } from "@/lib/notifications/push-center-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;
  try {
    return NextResponse.json({ ok: true, estimate: await getPushAudienceEstimate(await request.json() as PushAudienceInput) });
  } catch (error) {
    const code = error instanceof Error && error.message.startsWith("INVALID_") ? error.message : "AUDIENCE_ESTIMATE_FAILED";
    return NextResponse.json({ ok: false, error: { code } }, { status: 400 });
  }
}
