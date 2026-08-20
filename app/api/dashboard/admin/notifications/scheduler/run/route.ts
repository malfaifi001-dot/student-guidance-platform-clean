import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { runPushScheduler } from "@/lib/notifications/push-center-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const configuredSecret = process.env.PUSH_SCHEDULER_SECRET;
  const suppliedSecret = request.headers.get("x-push-scheduler-secret") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const supplied = Buffer.from(suppliedSecret || "", "utf8");
  const configured = Buffer.from(configuredSecret || "", "utf8");
  const matches = configured.length > 0 && supplied.length === configured.length && timingSafeEqual(supplied, configured);
  if (!matches) return NextResponse.json({ ok: false, error: { code: "SCHEDULER_UNAUTHORIZED" } }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, processed: await runPushScheduler() });
  } catch {
    return NextResponse.json({ ok: false, error: { code: "SCHEDULER_FAILED" } }, { status: 503 });
  }
}
