import { Capacitor } from "@capacitor/core";
import { navigateNativeDeepLink } from "@/lib/native/native-runtime";
import { resolveTeachixDeepLink } from "@/lib/deep-links/teachix-deep-link";

const TEACHIX_HOSTNAMES = new Set(["teachix.sa", "www.teachix.sa"]);

function isTeachixUrl(url: URL): boolean {
  return TEACHIX_HOSTNAMES.has(url.hostname.toLowerCase());
}

function isNativeAppUrl(url: URL): boolean {
  return ["mailto:", "tel:"].includes(url.protocol) ||
    url.hostname.toLowerCase() === "wa.me" ||
    url.hostname.toLowerCase().endsWith(".whatsapp.com");
}

export async function openExternalUrl(url: string, options?: { sameWindow?: boolean }): Promise<void> {
  if (typeof window === "undefined") return;

  let target: URL;
  try {
    target = new URL(url, window.location.origin);
  } catch {
    return;
  }
  const native = Capacitor.isNativePlatform();

  if (!native) {
    if (options?.sameWindow) {
      window.location.href = target.toString();
      return;
    }

    window.open(target.toString(), "_blank", "noopener,noreferrer");
    return;
  }

  if (isTeachixUrl(target) && target.hostname.toLowerCase() === "teachix.sa") {
    const resolved = resolveTeachixDeepLink(target.toString());
    if (!resolved.accepted || !resolved.normalizedRoute) return;
    navigateNativeDeepLink(resolved.normalizedRoute);
    return;
  }

  if (isNativeAppUrl(target) && (target.protocol === "mailto:" || target.protocol === "tel:")) {
    window.location.href = target.toString();
    return;
  }

  if (target.hostname.toLowerCase() === "wa.me" || target.hostname.toLowerCase().endsWith(".whatsapp.com")) {
    window.location.href = target.toString();
    return;
  }

  if (target.protocol === "http:" || target.protocol === "https:") {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: target.toString() });
    return;
  }

  return;
}
