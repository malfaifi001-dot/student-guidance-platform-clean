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

type FirebaseHealthDiagnostic = {
  category: "INVALID_CREDENTIAL" | "INVALID_PRIVATE_KEY" | "INVALID_PROJECT" | "AUTH_ERROR" | "UNKNOWN_FIREBASE_ERROR";
  firebaseCode?: string;
  errorName?: string;
};

function getFirebaseHealthDiagnostic(error: unknown): FirebaseHealthDiagnostic {
  const candidate = error && typeof error === "object" ? error as { code?: unknown; name?: unknown; message?: unknown } : {};
  const firebaseCode = typeof candidate.code === "string" && /^[a-z0-9._/-]{1,120}$/i.test(candidate.code)
    ? candidate.code
    : undefined;
  const errorName = typeof candidate.name === "string" && /^[a-z0-9._-]{1,120}$/i.test(candidate.name)
    ? candidate.name
    : undefined;
  const searchable = `${firebaseCode || ""} ${errorName || ""} ${typeof candidate.message === "string" ? candidate.message : ""}`.toLowerCase();

  let category: FirebaseHealthDiagnostic["category"] = "UNKNOWN_FIREBASE_ERROR";
  if (searchable.includes("private key") || searchable.includes("private_key") || searchable.includes("invalid pem")) {
    category = "INVALID_PRIVATE_KEY";
  } else if (searchable.includes("project") || searchable.includes("project-id") || searchable.includes("project_id")) {
    category = "INVALID_PROJECT";
  } else if (searchable.includes("auth") || searchable.includes("unauthenticated") || searchable.includes("permission-denied")) {
    category = "AUTH_ERROR";
  } else if (searchable.includes("credential")) {
    category = "INVALID_CREDENTIAL";
  }

  return { category, ...(firebaseCode ? { firebaseCode } : {}), ...(errorName ? { errorName } : {}) };
}

export function isFirebasePushConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

export function getFirebaseAdminHealth(): {
  environment: {
    firebaseProjectId: boolean;
    firebaseClientEmail: boolean;
    firebasePrivateKey: boolean;
  };
  firebaseAdmin: boolean;
  firebaseMessaging: boolean;
  error?: { code: string; message: string; diagnostic?: FirebaseHealthDiagnostic };
} {
  const environment = {
    firebaseProjectId: Boolean(process.env.FIREBASE_PROJECT_ID),
    firebaseClientEmail: Boolean(process.env.FIREBASE_CLIENT_EMAIL),
    firebasePrivateKey: Boolean(process.env.FIREBASE_PRIVATE_KEY),
  };

  if (!isFirebasePushConfigured()) {
    return {
      environment,
      firebaseAdmin: false,
      firebaseMessaging: false,
      error: {
        code: "FIREBASE_CONFIG_MISSING",
        message: "Firebase Admin configuration is incomplete",
      },
    };
  }

  try {
    const app = getFirebaseApp();
    if (!app) {
      return {
        environment,
        firebaseAdmin: false,
        firebaseMessaging: false,
        error: {
          code: "FIREBASE_ADMIN_UNAVAILABLE",
          message: "Firebase Admin could not be initialized",
        },
      };
    }

    getMessaging(app);
    return {
      environment,
      firebaseAdmin: true,
      firebaseMessaging: true,
    };
  } catch (error) {
    return {
      environment,
      firebaseAdmin: false,
      firebaseMessaging: false,
      error: {
        code: "FIREBASE_ADMIN_INITIALIZATION_FAILED",
        message: "Firebase Admin initialization failed",
        diagnostic: getFirebaseHealthDiagnostic(error),
      },
    };
  }
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
