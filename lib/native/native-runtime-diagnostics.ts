import { Capacitor } from "@capacitor/core";

type NativeDiagnosticPayload = Record<string, unknown>;

const VERBOSE_EVENTS = new Set([
  "native-runtime-mounted",
  "cold-start-detected",
  "cold-start-resolution-start",
  "deep-link-parsed",
  "deep-link-navigation-complete-attempt",
  "warm-listener-enabled",
  "app-resumed",
  "app-paused",
  "last-route-read",
  "last-route-valid",
  "last-route-rejected",
  "back-button-received",
  "back-navigation-history",
  "back-at-root",
  "native-onboarding-slide-changed",
]);

function getSafeDiagnosticPath(pathname: string): string {
  const tokenizedPrefixes = [
    "/school-signature/",
    "/report-signature/",
    "/survey/",
    "/teacher/activity-assignment/",
  ];
  const tokenizedPrefix = tokenizedPrefixes.find((prefix) => pathname.startsWith(prefix));
  return tokenizedPrefix ? `${tokenizedPrefix}[token]` : pathname;
}

export function logNativeRuntimeDiagnostic(
  event: string,
  payload: NativeDiagnosticPayload = {},
): void {
  if (!Capacitor.isNativePlatform()) return;
  if (VERBOSE_EVENTS.has(event) && process.env.NEXT_PUBLIC_NATIVE_DIAGNOSTICS !== "true") return;

  const entry = {
    event,
    timestamp: new Date().toISOString(),
    platform: Capacitor.getPlatform(),
    pathname:
      typeof window === "undefined" ? undefined : getSafeDiagnosticPath(window.location.pathname),
    isNative: true,
    ...payload,
  };

  try {
    console.log(`TEACHIX_NATIVE_DIAG ${JSON.stringify(entry)}`);
  } catch {
    console.log(
      `TEACHIX_NATIVE_DIAG ${JSON.stringify({
        event: "NATIVE_DIAGNOSTIC_SERIALIZATION_ERROR",
        timestamp: new Date().toISOString(),
        platform: Capacitor.getPlatform(),
        isNative: true,
      })}`,
    );
  }
}

export function safeDiagnosticMessage(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 240);
  if (typeof error === "string") return error.slice(0, 240);
  return "Unknown native runtime error";
}
