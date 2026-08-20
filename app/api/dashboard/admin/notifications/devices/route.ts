import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { listPushDevices, revokePushCenterDevice } from "@/lib/notifications/push-center-service";

export const runtime = "nodejs";

export async function GET() {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;
  return NextResponse.json({ devices: await listPushDevices() });
}

export async function DELETE(request: Request) {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;
  const body = await request.json().catch(() => null);
  const deviceId = typeof body?.deviceId === "string" ? body.deviceId : "";
  if (!deviceId) return NextResponse.json({ ok: false, error: { code: "MISSING_DEVICE_ID" } }, { status: 400 });
  const result = await revokePushCenterDevice(deviceId);
  return NextResponse.json({ ok: result.count > 0 });
}
