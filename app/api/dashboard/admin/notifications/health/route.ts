import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getFirebaseAdminHealth } from "@/lib/notifications/fcm-server";
import { isPushTokenEncryptionConfigured } from "@/lib/notifications/push-device-service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;

  const firebase = getFirebaseAdminHealth();
  const pushEncryption = isPushTokenEncryptionConfigured();
  const activeWhere = { packageName: "sa.teachix.app", enabled: true, revokedAt: null } as const;
  const [androidDevices, iosDevices, latestAndroid, latestIos] = await Promise.all([
    prisma.pushDevice.count({ where: { ...activeWhere, platform: "android" } }),
    prisma.pushDevice.count({ where: { ...activeWhere, platform: "ios" } }),
    prisma.pushDelivery.findFirst({ where: { device: { platform: "android", packageName: "sa.teachix.app" } }, orderBy: { attemptedAt: "desc" }, select: { status: true, errorCategory: true, errorCode: true, attemptedAt: true } }),
    prisma.pushDelivery.findFirst({ where: { device: { platform: "ios", packageName: "sa.teachix.app" } }, orderBy: { attemptedAt: "desc" }, select: { status: true, errorCategory: true, errorCode: true, attemptedAt: true } }),
  ]);
  const ok = firebase.firebaseAdmin && firebase.firebaseMessaging && pushEncryption;

  return NextResponse.json(
    {
      ok,
      environment: {
        ...firebase.environment,
        pushTokenEncryptionKey: pushEncryption,
      },
      firebaseAdmin: firebase.firebaseAdmin,
      firebaseMessaging: firebase.firebaseMessaging,
      pushEncryption,
      platforms: {
        android: { activeDevices: androidDevices, latestDelivery: latestAndroid },
        ios: { activeDevices: iosDevices, packageName: "sa.teachix.app", productionCapableRegistrationExists: iosDevices > 0, latestDelivery: latestIos },
      },
      ...(firebase.error
        ? {
            error: {
              code: firebase.error.code,
              message: firebase.error.message,
              ...(firebase.error.diagnostic ? { diagnostic: firebase.error.diagnostic } : {}),
            },
          }
        : {}),
    },
    { status: ok ? 200 : 503 },
  );
}
