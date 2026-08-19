import { Capacitor } from "@capacitor/core";

export const NATIVE_ONBOARDING_COMPLETED_KEY = "teachix_native_onboarding_completed";
export const NATIVE_STARTUP_READY_EVENT = "teachix:native-startup-ready";
export const NATIVE_ONBOARDING_REVIEW_EVENT = "teachix:native-onboarding-review";

let startupDecision: { deepLinkHandled: boolean } | null = null;
let nativeOnboardingReviewOpen = false;

export function hasCompletedNativeOnboarding(): boolean {
  if (!Capacitor.isNativePlatform() || typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(NATIVE_ONBOARDING_COMPLETED_KEY) === "true";
  } catch {
    return false;
  }
}

export function completeNativeOnboarding(): void {
  if (!Capacitor.isNativePlatform() || typeof window === "undefined") return;

  try {
    window.localStorage.setItem(NATIVE_ONBOARDING_COMPLETED_KEY, "true");
  } catch {
    // A storage failure must not prevent the user from continuing into auth.
  }
}

export function publishNativeStartupReady(deepLinkHandled: boolean): void {
  if (!Capacitor.isNativePlatform() || typeof window === "undefined") return;

  startupDecision = { deepLinkHandled };
  window.dispatchEvent(
    new CustomEvent(NATIVE_STARTUP_READY_EVENT, {
      detail: { deepLinkHandled },
    }),
  );
}

export function getNativeStartupDecision(): { deepLinkHandled: boolean } | null {
  return startupDecision;
}

export function openNativeOnboardingReview(returnPath: "/login" | "/register"): void {
  if (!Capacitor.isNativePlatform() || typeof window === "undefined") return;
  nativeOnboardingReviewOpen = true;
  window.dispatchEvent(new CustomEvent(NATIVE_ONBOARDING_REVIEW_EVENT, {
    detail: { action: "open", returnPath },
  }));
}

export function closeNativeOnboardingReview(): void {
  if (!Capacitor.isNativePlatform() || typeof window === "undefined") return;
  nativeOnboardingReviewOpen = false;
  window.dispatchEvent(new CustomEvent(NATIVE_ONBOARDING_REVIEW_EVENT, {
    detail: { action: "close" },
  }));
}

export function isNativeOnboardingReviewOpen(): boolean {
  return nativeOnboardingReviewOpen;
}
