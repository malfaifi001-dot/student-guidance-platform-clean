import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging, type BatchResponse, type MulticastMessage } from "firebase-admin/messaging";
import {
  decryptPushToken,
  disablePushDevicesByTokenHashes,
  getEnabledPushDevicesForUsers,
  hashPushToken,
} from "@/lib/notifications/push-device-service";
import { getSafePushRoute } from "@/lib/notifications/push-routing";
import { isSafePushPayload, type TeachixPushPayload } from "@/lib/notifications/push-types";

function getFirebaseApp() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) return null;
  return getApps()[0] || initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

export function isFirebasePushConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

function buildMessage(tokens: string[], payload: TeachixPushPayload): MulticastMessage {
  const route = getSafePushRoute(payload.route);
  if (!route || !isSafePushPayload({ ...payload, route })) {
    throw new Error("Unsafe push payload");
  }

  return {
    tokens,
    notification: { title: payload.title, body: payload.body },
    data: {
      route,
      type: payload.type,
      ...(payload.recordId ? { recordId: payload.recordId } : {}),
    },
    android: {
      notification: { channelId: "teachix_default", sound: "default" },
    },
  };
}

async function sendChunk(tokens: string[], payload: TeachixPushPayload): Promise<BatchResponse> {
  const app = getFirebaseApp();
  if (!app) throw new Error("Firebase push credentials are not configured");
  return getMessaging(app).sendEachForMulticast(buildMessage(tokens, payload));
}

export async function sendPushToUsers(
  userIds: string[],
  payload: TeachixPushPayload,
): Promise<{ successCount: number; failureCount: number }> {
  const devices = await getEnabledPushDevicesForUsers(userIds);
  let successCount = 0;
  let failureCount = 0;

  for (let offset = 0; offset < devices.length; offset += 500) {
    const chunk = devices.slice(offset, offset + 500);
    const tokenPairs = chunk.map((device) => ({
      deviceId: device.id,
      tokenHash: device.tokenHash,
      token: decryptPushToken(device.encryptedToken),
    }));
    const result = await sendChunk(tokenPairs.map((pair) => pair.token), payload);
    successCount += result.successCount;
    failureCount += result.failureCount;

    const invalidHashes = result.responses.flatMap((response, index) => {
      const code = response.error?.code || "";
      return code.includes("registration-token-not-registered") || code.includes("invalid-registration-token")
        ? [hashPushToken(tokenPairs[index].token)]
        : [];
    });
    await disablePushDevicesByTokenHashes(invalidHashes);
  }

  return { successCount, failureCount };
}
