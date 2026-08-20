import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getFirebaseAdminHealth } from "@/lib/notifications/fcm-server";
import { isPushTokenEncryptionConfigured } from "@/lib/notifications/push-device-service";

export const runtime = "nodejs";

export async function GET() {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;

  const firebase = getFirebaseAdminHealth();
  const pushEncryption = isPushTokenEncryptionConfigured();
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
      privateKeyDiagnostic: firebase.privateKeyDiagnostic,
      pushEncryption,
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
