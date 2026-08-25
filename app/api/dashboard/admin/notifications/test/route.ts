import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { sendPushTestToDevice } from "@/lib/notifications/push-center-service";
import { getEnabledPushDeviceById, getMostRecentlyActiveEnabledPushDevice } from "@/lib/notifications/push-device-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;
  const current = await getCurrentSessionUser();
  if (!current?.user) return NextResponse.json({ ok: false, error: { code: "UNAUTHENTICATED" } }, { status: 401 });

  const body = await request.json().catch(() => null) as { deviceId?: unknown } | null;
  const hasExplicitDevice = typeof body?.deviceId === "string" && body.deviceId.length > 0;
  let device;
  try {
    device = hasExplicitDevice
      ? await getEnabledPushDeviceById(body.deviceId as string)
      : await getMostRecentlyActiveEnabledPushDevice();
  } catch {
    return NextResponse.json({ ok: false, error: { code: "PUSH_TEST_DATABASE_FAILED" } }, { status: 503 });
  }
  if (!device) {
    return NextResponse.json({ ok: false, ...(hasExplicitDevice ? { deviceId: body?.deviceId } : {}), error: { code: hasExplicitDevice ? "DEVICE_NOT_FOUND_OR_DISABLED" : "NO_ENABLED_PUSH_DEVICE" } }, { status: 404 });
  }

  try {
    const result = await sendPushTestToDevice(device, current.user.id);
    return NextResponse.json({
      ok: result.success,
      deviceId: device.id,
      platform: result.platform,
      deliveryId: result.deliveryId,
      ...(result.messageId ? { messageId: result.messageId } : {}),
      ...(result.success ? {} : { errorCategory: result.errorCategory, errorCode: result.errorCode, errorMessage: result.safeErrorMessage, retryable: result.retryable, invalidToken: result.invalidToken }),
    }, { status: result.success ? 200 : 502 });
  } catch {
    return NextResponse.json({ ok: false, deviceId: device.id, platform: device.platform, error: { code: "PUSH_TEST_SEND_FAILED" } }, { status: 502 });
  }
}
