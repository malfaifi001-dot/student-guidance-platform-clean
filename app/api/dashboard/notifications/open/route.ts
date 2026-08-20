import { NextResponse } from "next/server";

import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { recordPushOpen } from "@/lib/notifications/push-center-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const current = await getCurrentSessionUser();
  if (!current?.user) return NextResponse.json({ ok: false, error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  const body = await request.json().catch(() => null);
  if ((typeof body?.deliveryId !== "string" && typeof body?.campaignId !== "string") || typeof body?.route !== "string") return NextResponse.json({ ok: false, error: { code: "INVALID_OPEN_EVENT" } }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, ...(await recordPushOpen({ deliveryId: typeof body.deliveryId === "string" ? body.deliveryId : undefined, campaignId: typeof body.campaignId === "string" ? body.campaignId : undefined, userId: current.user.id, route: body.route })) });
  } catch {
    return NextResponse.json({ ok: false, error: { code: "PUSH_OPEN_FAILED" } }, { status: 400 });
  }
}
