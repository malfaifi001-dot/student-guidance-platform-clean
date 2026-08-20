import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import {
  PushTokenProtectionError,
  revokePushDevice,
  upsertPushDevice,
} from "@/lib/notifications/push-device-service";

const PACKAGE_NAME = "sa.teachix.app";

export async function POST(request: Request) {
  const current = await getCurrentSessionUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      token?: unknown;
      platform?: unknown;
      packageName?: unknown;
    };

    if (
      typeof body.token !== "string" ||
      body.token.trim().length < 20 ||
      body.token.trim().length > 4096 ||
      body.platform !== "android" ||
      body.packageName !== PACKAGE_NAME
    ) {
      return NextResponse.json({ error: "Invalid push device" }, { status: 400 });
    }

    const device = await upsertPushDevice({
      userId: current.user.id,
      token: body.token.trim(),
      platform: "android",
      packageName: PACKAGE_NAME,
    });

    return NextResponse.json({ success: true, deviceId: device.id });
  } catch (error) {
    if (error instanceof PushTokenProtectionError) {
      return NextResponse.json({ error: "Push storage is not configured" }, { status: 503 });
    }
    return NextResponse.json({ error: "Unable to register push device" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const current = await getCurrentSessionUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as { deviceId?: unknown };
    if (typeof body.deviceId !== "string" || body.deviceId.length < 10) {
      return NextResponse.json({ error: "Invalid push device" }, { status: 400 });
    }

    await revokePushDevice(current.user.id, body.deviceId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unable to revoke push device" }, { status: 500 });
  }
}
