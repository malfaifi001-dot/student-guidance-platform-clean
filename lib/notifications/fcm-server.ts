import "server-only";

import { createPrivateKey } from "node:crypto";
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
import { normalizePushError, type NormalizedPushError } from "@/lib/notifications/push-error";

type FirebaseHealthDiagnostic = {
  category: "INVALID_CREDENTIAL" | "INVALID_PRIVATE_KEY" | "INVALID_PROJECT" | "AUTH_ERROR" | "UNKNOWN_FIREBASE_ERROR";
  firebaseCode?: string;
  errorName?: string;
};

export type FirebasePrivateKeyDiagnostic = {
  rawLength: number;
  normalizedLength: number;
  startsWithBeginMarker: boolean;
  endsWithEndMarker: boolean;
  containsLiteralBackslashN: boolean;
  containsActualNewline: boolean;
  hasOuterQuotes: boolean;
  normalizationChanged: boolean;
  nodeCryptoParse: boolean;
};

type FirebasePrivateKeySource = "BASE64" | "PEM" | "NONE";

type ResolvedFirebasePrivateKey = {
  source: FirebasePrivateKeySource;
  value?: string;
  diagnostic: FirebasePrivateKeyDiagnostic;
  failureCode?: "MISSING_PRIVATE_KEY" | "INVALID_PRIVATE_KEY_BASE64" | "INVALID_PRIVATE_KEY";
};

function removeMatchingOuterQuotes(value: string): string {
  if (value.length >= 2 && (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  )) {
    return value.slice(1, -1).trim();
  }
  return value;
}

function normalizePrivateKey(value: string): string {
  return removeMatchingOuterQuotes(value.trim())
    .replace(/\r\n?/g, "\n")
    .replace(/\\\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\(?=\n)/g, "");
}

function getPrivateKeyDiagnostic(raw: string, normalized: string): FirebasePrivateKeyDiagnostic {
  const trimmedNormalized = normalized.trim();
  const hasOuterQuotes = raw.length >= 2 && (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  );

  let nodeCryptoParse = false;
  if (normalized) {
    try {
      createPrivateKey({ key: normalized, format: "pem" });
      nodeCryptoParse = true;
    } catch {
      nodeCryptoParse = false;
    }
  }

  return {
    rawLength: raw.length,
    normalizedLength: normalized.length,
    startsWithBeginMarker: trimmedNormalized.startsWith("-----BEGIN PRIVATE KEY-----"),
    endsWithEndMarker: trimmedNormalized.endsWith("-----END PRIVATE KEY-----"),
    containsLiteralBackslashN: raw.includes("\\n"),
    containsActualNewline: raw.includes("\n") || raw.includes("\r"),
    hasOuterQuotes,
    normalizationChanged: raw !== normalized,
    nodeCryptoParse,
  };
}

function isStructurallyValidPrivateKey(value: string): boolean {
  const normalized = value.trim();
  if (!normalized.startsWith("-----BEGIN PRIVATE KEY-----") || !normalized.endsWith("-----END PRIVATE KEY-----")) {
    return false;
  }

  try {
    createPrivateKey({ key: normalized, format: "pem" });
    return true;
  } catch {
    return false;
  }
}

function decodeBase64PrivateKey(rawBase64: string): string | null {
  const value = removeMatchingOuterQuotes(rawBase64.trim());
  if (!value || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) return null;

  const decoded = Buffer.from(value, "base64").toString("utf8");
  const normalized = normalizePrivateKey(decoded);
  return isStructurallyValidPrivateKey(normalized) ? normalized : null;
}

function resolveFirebasePrivateKey(): ResolvedFirebasePrivateKey {
  const base64 = process.env.FIREBASE_PRIVATE_KEY_BASE64;
  if (base64) {
    const decoded = decodeBase64PrivateKey(base64);
    if (decoded) {
      return {
        source: "BASE64",
        value: decoded,
        diagnostic: getPrivateKeyDiagnostic(base64, decoded),
      };
    }
  }

  const rawPem = process.env.FIREBASE_PRIVATE_KEY || "";
  const normalizedPem = normalizePrivateKey(rawPem);
  if (isStructurallyValidPrivateKey(normalizedPem)) {
    return {
      source: "PEM",
      value: normalizedPem,
      diagnostic: getPrivateKeyDiagnostic(rawPem, normalizedPem),
    };
  }

  return {
    source: "NONE",
    diagnostic: getPrivateKeyDiagnostic(rawPem, normalizedPem),
    failureCode: base64
      ? "INVALID_PRIVATE_KEY_BASE64"
      : rawPem
        ? "INVALID_PRIVATE_KEY"
        : "MISSING_PRIVATE_KEY",
  };
}

function getFirebaseApp(privateKey = resolveFirebasePrivateKey().value) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !clientEmail || !privateKey) return null;
  return getApps()[0] || initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

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
      resolveFirebasePrivateKey().value,
  );
}

export function getFirebaseAdminHealth(): {
  environment: {
    firebaseProjectId: boolean;
    firebaseClientEmail: boolean;
    firebasePrivateKey: boolean;
    firebasePrivateKeyBase64: boolean;
  };
  firebaseAdmin: boolean;
  firebaseMessaging: boolean;
  privateKeySource: FirebasePrivateKeySource;
  privateKeyDiagnostic: FirebasePrivateKeyDiagnostic;
  error?: { code: string; message: string; diagnostic?: FirebaseHealthDiagnostic };
} {
  const environment = {
    firebaseProjectId: Boolean(process.env.FIREBASE_PROJECT_ID),
    firebaseClientEmail: Boolean(process.env.FIREBASE_CLIENT_EMAIL),
    firebasePrivateKey: Boolean(process.env.FIREBASE_PRIVATE_KEY),
    firebasePrivateKeyBase64: Boolean(process.env.FIREBASE_PRIVATE_KEY_BASE64),
  };
  const resolvedPrivateKey = resolveFirebasePrivateKey();
  const privateKeyDiagnostic = resolvedPrivateKey.diagnostic;

  if (!environment.firebaseProjectId || !environment.firebaseClientEmail || !resolvedPrivateKey.value) {
    const code = !environment.firebaseProjectId
      ? "MISSING_FIREBASE_PROJECT_ID"
      : !environment.firebaseClientEmail
        ? "MISSING_FIREBASE_CLIENT_EMAIL"
        : resolvedPrivateKey.failureCode || "INVALID_PRIVATE_KEY";
    return {
      environment,
      firebaseAdmin: false,
      firebaseMessaging: false,
      privateKeySource: resolvedPrivateKey.source,
      privateKeyDiagnostic,
      error: {
        code,
        message: "Firebase Admin configuration is incomplete",
      },
    };
  }

  try {
    const app = getFirebaseApp(resolvedPrivateKey.value);
    if (!app) {
      return {
        environment,
        firebaseAdmin: false,
        firebaseMessaging: false,
        privateKeySource: resolvedPrivateKey.source,
        privateKeyDiagnostic,
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
      privateKeySource: resolvedPrivateKey.source,
      privateKeyDiagnostic,
    };
  } catch (error) {
    return {
      environment,
      firebaseAdmin: false,
      firebaseMessaging: false,
      privateKeySource: resolvedPrivateKey.source,
      privateKeyDiagnostic,
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
      ...(payload.campaignId ? { campaignId: payload.campaignId } : {}),
    },
    android: {
      notification: { channelId: "teachix_default", sound: "default" },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
        },
      },
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

export async function sendPushToDevice(
  device: { tokenHash: string; encryptedToken: string },
  payload: TeachixPushPayload,
): Promise<{ success: boolean; invalidToken: boolean; messageId?: string; errorCode?: string; errorCategory?: string; safeErrorMessage?: string; retryable?: boolean }> {
  const result = await sendPushToDeviceBatch([{ id: "single", ...device }], payload);
  const first = result[0];
  if (!first) throw new Error("Push device send did not return a result");
  return { success: first.success, invalidToken: first.invalidToken, ...(first.messageId ? { messageId: first.messageId } : {}), ...(first.errorCode ? { errorCode: first.errorCode } : {}), ...(first.errorCategory ? { errorCategory: first.errorCategory } : {}), ...(first.safeErrorMessage ? { safeErrorMessage: first.safeErrorMessage } : {}), ...(first.retryable !== undefined ? { retryable: first.retryable } : {}) };
}

export async function sendPushToDeviceBatch(
  devices: Array<{ id: string; tokenHash: string; encryptedToken: string }>,
  payload: TeachixPushPayload,
): Promise<Array<{ id: string; success: boolean; invalidToken: boolean; messageId?: string; errorCode?: string; errorCategory?: string; safeErrorMessage?: string; retryable?: boolean }>> {
  const results: Array<{ id: string; success: boolean; invalidToken: boolean; messageId?: string; errorCode?: string; errorCategory?: string; safeErrorMessage?: string; retryable?: boolean }> = [];

  for (let offset = 0; offset < devices.length; offset += 500) {
    const chunk = devices.slice(offset, offset + 500);
    const validDevices: Array<{ id: string; tokenHash: string; token: string }> = [];

    for (const device of chunk) {
      try {
        validDevices.push({ id: device.id, tokenHash: device.tokenHash, token: decryptPushToken(device.encryptedToken) });
      } catch {
        const error = normalizePushError("TOKEN_DECRYPTION_FAILED", null);
        results.push({ id: device.id, success: false, ...error });
      }
    }

    if (validDevices.length === 0) continue;
    const response = await sendChunk(validDevices.map((device) => device.token), payload);
    const invalidHashes: string[] = [];

    response.responses.forEach((item, index) => {
      const device = validDevices[index];
      const normalized: NormalizedPushError | null = item.success ? null : normalizePushError(item.error?.code, item.error?.message);
      if (normalized?.invalidToken) invalidHashes.push(hashPushToken(device.token));
      results.push({
        id: device.id,
        success: Boolean(item.success),
        invalidToken: normalized?.invalidToken || false,
        ...(item.messageId ? { messageId: item.messageId } : {}),
        ...(normalized ? { errorCode: normalized.code, errorCategory: normalized.category, safeErrorMessage: normalized.safeMessage, retryable: normalized.retryable } : {}),
      });
    });
    await disablePushDevicesByTokenHashes(invalidHashes);
  }

  return results;
}
