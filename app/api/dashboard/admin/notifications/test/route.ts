import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { sendPushToDevice } from "@/lib/notifications/fcm-server";
import { getEnabledAndroidPushDeviceById, getMostRecentlyActiveEnabledAndroidPushDevice } from "@/lib/notifications/push-device-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;

  let device: Awaited<ReturnType<typeof getMostRecentlyActiveEnabledAndroidPushDevice>>;
  try {
    const body = await request.json().catch(() => null) as { deviceId?: unknown } | null;
    device = typeof body?.deviceId === "string" ? await getEnabledAndroidPushDeviceById(body.deviceId) : await getMostRecentlyActiveEnabledAndroidPushDevice();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "PUSH_TEST_DATABASE_FAILED" } },
      { status: 503 },
    );
  }
  if (!device) {
    return NextResponse.json(
      { ok: false, error: { code: "NO_ENABLED_ANDROID_DEVICE" } },
      { status: 404 },
    );
  }

  const deviceMetadata = {
    found: true,
    platform: device.platform,
    packageName: device.packageName,
    userId: device.userId,
    lastSeenAt: device.lastSeenAt.toISOString(),
  };

  try {
    const result = await sendPushToDevice(device, {
      title: "اختبار إشعارات Teachix",
      body: "تم ربط Firebase بنجاح، والإشعارات تعمل الآن.",
      route: "/dashboard",
      type: "system-announcement",
    });

    return NextResponse.json({
      ok: result.success,
      device: deviceMetadata,
      send: {
        attempted: true,
        success: result.success,
        invalidToken: result.invalidToken,
        ...(result.messageId ? { messageId: result.messageId } : {}),
      },
    }, { status: result.success ? 200 : 502 });
  } catch {
    return NextResponse.json({
      ok: false,
      device: deviceMetadata,
      send: {
        attempted: true,
        success: false,
        invalidToken: false,
      },
      error: { code: "PUSH_TEST_SEND_FAILED" },
    }, { status: 502 });
  }
}
