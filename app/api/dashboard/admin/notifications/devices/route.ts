import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { listPushDevices, setPushCenterDeviceEnabled } from "@/lib/notifications/push-center-service";
import { getCurrentSessionUser } from "@/lib/auth/current-user";

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
  const current = await getCurrentSessionUser();
  const result = await setPushCenterDeviceEnabled(deviceId, false, current?.user.id);
  return NextResponse.json({ ok: result.count > 0 });
}

export async function PATCH(request: Request) {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;
  const current = await getCurrentSessionUser();
  const body = await request.json().catch(() => null);
  const deviceId = typeof body?.deviceId === "string" ? body.deviceId : "";
  if (!deviceId || typeof body?.enabled !== "boolean") return NextResponse.json({ ok: false, error: { code: "INVALID_DEVICE_STATE" } }, { status: 400 });
  const result = await setPushCenterDeviceEnabled(deviceId, body.enabled, current?.user.id);
  return NextResponse.json({ ok: result.count > 0, deviceId, enabled: body.enabled });
}
