import { Capacitor } from "@capacitor/core";
import {
  logNativeRuntimeDiagnostic,
  safeDiagnosticMessage,
} from "@/lib/native/native-runtime-diagnostics";

export const NATIVE_LAST_ROUTE_STORAGE_KEY = "teachix_native_last_route";

const TECHNICAL_ROUTE_PREFIXES = [
  "/api",
  "/portfolio-export-preview/",
  "/report-2-export-preview/",
  "/pdf-preview/",
  "/print/",
];

const PUBLIC_TOKEN_ROUTE_PREFIXES = [
  "/school-signature/",
  "/survey/",
  "/teacher/activity-assignment/",
  "/report-signature/",
];

export type NativeRouteKind =
  | "DASHBOARD_APP_ROUTE"
  | "PUBLIC_TOKEN_ROUTE"
  | "PUBLIC_PAGE"
  | "TECHNICAL_DENIED_ROUTE"
  | "INVALID_ROUTE";

export function isNativeCapacitor(): boolean {
  return Capacitor.isNativePlatform();
}

function isTechnicalNativeRoute(pathname: string): boolean {
  return TECHNICAL_ROUTE_PREFIXES.some((prefix) => {
    if (prefix === "/api") return pathname === "/api" || pathname.startsWith("/api/");
    return pathname === prefix.slice(0, -1) || pathname.startsWith(prefix);
  });
}

export function getNativeRouteKind(pathname: string): NativeRouteKind {
  if (!pathname.startsWith("/") || pathname.startsWith("//")) {
    return "INVALID_ROUTE";
  }

  if (isTechnicalNativeRoute(pathname)) {
    return "TECHNICAL_DENIED_ROUTE";
  }

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return "DASHBOARD_APP_ROUTE";
  }

  if (PUBLIC_TOKEN_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return "PUBLIC_TOKEN_ROUTE";
  }

  return "PUBLIC_PAGE";
}

function isAllowedNativeRoute(pathname: string): boolean {
  return getNativeRouteKind(pathname) !== "TECHNICAL_DENIED_ROUTE" &&
    getNativeRouteKind(pathname) !== "INVALID_ROUTE";
}

function isPersistableNativeRoute(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

export function getNativeDeepLinkRejectionReason(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return "UNSAFE_SCHEME";
    if (url.hostname !== "teachix.sa") return "EXTERNAL_ORIGIN";
    if (getNativeRouteKind(url.pathname) === "TECHNICAL_DENIED_ROUTE") {
      return "TECHNICAL_ROUTE_DENIED";
    }
    return "INVALID_ROUTE";
  } catch {
    return "INVALID_ROUTE";
  }
}

export function getNativeDiagnosticPath(pathname: string): string {
  const tokenizedPrefix = PUBLIC_TOKEN_ROUTE_PREFIXES.find((prefix) => pathname.startsWith(prefix));
  if (tokenizedPrefix) return `${tokenizedPrefix}[token]`;

  return pathname;
}

export function getSafeNativeDeepLinkPath(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "teachix.sa" ||
      !isAllowedNativeRoute(url.pathname)
    ) {
      return null;
    }

    return url.pathname;
  } catch {
    return null;
  }
}

export function getSafeNativeRoute(value: string): string | null {
  if (typeof window === "undefined") return null;

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || !isPersistableNativeRoute(url.pathname)) {
      return null;
    }

    return url.pathname;
  } catch {
    return null;
  }
}

export function getSafeNativeNavigationPath(value: string): string | null {
  if (typeof window === "undefined") return null;

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || !isAllowedNativeRoute(url.pathname)) {
      return null;
    }

    return url.pathname;
  } catch {
    return null;
  }
}

export function readNativeLastRoute(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const storedRoute = window.localStorage.getItem(NATIVE_LAST_ROUTE_STORAGE_KEY);
    logNativeRuntimeDiagnostic("last-route-read", { hasStoredRoute: Boolean(storedRoute) });
    if (!storedRoute) {
      logNativeRuntimeDiagnostic("last-route-rejected", { reason: "NO_STORED_ROUTE" });
      return null;
    }

    const safeRoute = getSafeNativeRoute(storedRoute);
    logNativeRuntimeDiagnostic(safeRoute ? "last-route-valid" : "last-route-rejected", {
      ...(safeRoute ? { safePath: safeRoute } : { reason: "INVALID_ROUTE" }),
    });
    return safeRoute;
  } catch (error) {
    logNativeRuntimeDiagnostic("native-runtime-error", {
      errorCode: "NATIVE_LAST_ROUTE_READ_ERROR",
      message: safeDiagnosticMessage(error),
      context: "readNativeLastRoute",
    });
    return null;
  }
}

export function persistNativeRoute(value = window.location.pathname): void {
  if (typeof window === "undefined") return;

  const safeRoute = getSafeNativeRoute(value);
  try {
    if (safeRoute) {
      window.localStorage.setItem(NATIVE_LAST_ROUTE_STORAGE_KEY, safeRoute);
    } else if (window.location.pathname === "/login") {
      window.localStorage.removeItem(NATIVE_LAST_ROUTE_STORAGE_KEY);
      logNativeRuntimeDiagnostic("last-route-cleared", { reason: "LOGIN_ROUTE" });
    }
  } catch {
    logNativeRuntimeDiagnostic("native-runtime-error", {
      errorCode: "NATIVE_LAST_ROUTE_WRITE_ERROR",
      message: "Unable to persist native route",
      context: "persistNativeRoute",
    });
  }
}

export function clearNativeLastRoute(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(NATIVE_LAST_ROUTE_STORAGE_KEY);
    logNativeRuntimeDiagnostic("last-route-cleared", { reason: "EXPLICIT_CLEAR" });
  } catch {
    logNativeRuntimeDiagnostic("native-runtime-error", {
      errorCode: "NATIVE_LAST_ROUTE_WRITE_ERROR",
      message: "Unable to clear native route",
      context: "clearNativeLastRoute",
    });
  }
}

export function navigateNativeDeepLink(pathname: string): boolean {
  if (typeof window === "undefined") return false;

  const safePath = getSafeNativeNavigationPath(pathname);
  if (!safePath) return false;

  if (window.location.pathname === safePath) {
    persistNativeRoute(safePath);
    return true;
  }

  const routeKind = getNativeRouteKind(safePath);
  if (routeKind === "PUBLIC_TOKEN_ROUTE") {
    logNativeRuntimeDiagnostic("public-token-route-full-navigation", {
      routeKind,
      safeRouteLabel: getNativeDiagnosticPath(safePath),
      coldStart: false,
    });
    window.location.assign(safePath);
    return true;
  }

  if (window.location.pathname === "/login") {
    window.location.assign(safePath);
  } else {
    window.history.pushState(window.history.state, "", safePath);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
  return true;
}

export function createNativeRouteTracker() {
  if (typeof window === "undefined") {
    return {
      canGoBack: () => false,
      destroy: () => undefined,
    };
  }

  const originalPushState = window.history.pushState.bind(window.history);
  const originalReplaceState = window.history.replaceState.bind(window.history);
  const routes = [getSafeNativeNavigationPath(window.location.pathname) || "/dashboard"];
  let currentIndex = 0;

  const recordPush = () => {
    const route = getSafeNativeNavigationPath(window.location.pathname);
    if (!route) return;

    routes.splice(currentIndex + 1);
    routes.push(route);
    currentIndex = routes.length - 1;
    persistNativeRoute(route);
  };

  const recordReplace = () => {
    const route = getSafeNativeNavigationPath(window.location.pathname);
    if (!route) return;

    routes[currentIndex] = route;
    persistNativeRoute(route);
  };

  const handlePopState = () => {
    const route = getSafeNativeNavigationPath(window.location.pathname);
    if (!route) return;

    const existingIndex = routes.lastIndexOf(route);
    if (existingIndex >= 0) {
      currentIndex = existingIndex;
    } else {
      routes.splice(currentIndex + 1);
      routes.push(route);
      currentIndex = routes.length - 1;
    }
    persistNativeRoute(route);
  };

  window.history.pushState = ((data: unknown, unused: string, url?: string | URL | null) => {
    originalPushState(data, unused, url);
    recordPush();
  }) as History["pushState"];

  window.history.replaceState = ((data: unknown, unused: string, url?: string | URL | null) => {
    originalReplaceState(data, unused, url);
    recordReplace();
  }) as History["replaceState"];

  window.addEventListener("popstate", handlePopState);
  persistNativeRoute();

  return {
    canGoBack: () => currentIndex > 0,
    destroy: () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", handlePopState);
    },
  };
}
