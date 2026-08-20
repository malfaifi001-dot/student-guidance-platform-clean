"use client";

import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { logNativeRuntimeDiagnostic } from "@/lib/native/native-runtime-diagnostics";

export const TEACHIX_PUSH_CHANNEL_ID = "teachix_default";
const NATIVE_PUSH_DEVICE_ID_KEY = "teachix_native_push_device_id";

let setupPromise: Promise<void> | null = null;

function readDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(NATIVE_PUSH_DEVICE_ID_KEY);
  } catch {
    return null;
  }
}

function writeDeviceId(deviceId: string): void {
  try {
    window.sessionStorage.setItem(NATIVE_PUSH_DEVICE_ID_KEY, deviceId);
  } catch {
    // The server registration remains valid even if session storage is unavailable.
  }
}

function clearDeviceId(): void {
  try {
    window.sessionStorage.removeItem(NATIVE_PUSH_DEVICE_ID_KEY);
  } catch {
    // Nothing else is required when session storage is unavailable.
  }
}

async function registerDeviceToken(token: string): Promise<void> {
  const response = await fetch("/api/dashboard/notifications/devices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      platform: "android",
      packageName: "sa.teachix.app",
    }),
  });

  if (!response.ok) {
    logNativeRuntimeDiagnostic("push-registration-failed", {
      reason: "DEVICE_API_REJECTED",
      status: response.status,
    });
    return;
  }

  const result = (await response.json()) as { deviceId?: unknown };
  if (typeof result.deviceId === "string" && result.deviceId.length > 0) {
    writeDeviceId(result.deviceId);
  }

  logNativeRuntimeDiagnostic("push-registration-succeeded", {
    tokenPresent: true,
  });
}

async function setupChannel(): Promise<void> {
  await PushNotifications.createChannel({
    id: TEACHIX_PUSH_CHANNEL_ID,
    name: "إشعارات Teachix",
    description: "الإشعارات والتنبيهات الخاصة بمنصة Teachix",
    importance: 4,
    sound: "default",
    vibration: true,
  });
}

export function initializeNativePushNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return Promise.resolve();
  if (setupPromise) return setupPromise;

  setupPromise = (async () => {
    await setupChannel();

    await PushNotifications.addListener("registration", ({ value }) => {
      void registerDeviceToken(value).catch(() => {
        logNativeRuntimeDiagnostic("push-registration-failed", {
          reason: "DEVICE_API_REQUEST_FAILED",
        });
      });
    });

    await PushNotifications.addListener("registrationError", () => {
      logNativeRuntimeDiagnostic("push-registration-failed", {
        reason: "NATIVE_REGISTRATION_ERROR",
      });
    });

    await PushNotifications.addListener("pushNotificationReceived", () => {
      logNativeRuntimeDiagnostic("push-notification-received", {
        hasNotification: true,
      });
    });

    const current = await PushNotifications.checkPermissions();
    logNativeRuntimeDiagnostic("push-permission-status", {
      status: current.receive,
    });

    let permission = current;
    if (permission.receive === "prompt" || permission.receive === "prompt-with-rationale") {
      permission = await PushNotifications.requestPermissions();
      logNativeRuntimeDiagnostic("push-permission-status", {
        status: permission.receive,
      });
    }

    if (permission.receive !== "granted") return;
    await PushNotifications.register();
  })().catch((error) => {
    setupPromise = null;
    logNativeRuntimeDiagnostic("push-registration-failed", {
      reason: "NATIVE_SETUP_FAILED",
      errorCode: error instanceof Error ? error.name : "UNKNOWN",
    });
  });

  return setupPromise;
}

export async function revokeCurrentNativePushDevice(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const deviceId = readDeviceId();
  if (!deviceId) return;

  try {
    await fetch("/api/dashboard/notifications/devices", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId }),
    });
  } finally {
    clearDeviceId();
  }
}
