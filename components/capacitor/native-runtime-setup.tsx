"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import {
  logNativeRuntimeDiagnostic,
  safeDiagnosticMessage,
} from "@/lib/native/native-runtime-diagnostics";
import {
  clearNativeLastRoute,
  createNativeRouteTracker,
  getSafeNativeDeepLinkPath,
  isNativeCapacitor,
  navigateNativeDeepLink,
  readNativeLastRoute,
} from "@/lib/native/native-runtime";

export function NativeRuntimeSetup() {
  useEffect(() => {
    if (!isNativeCapacitor()) return;

    logNativeRuntimeDiagnostic("native-runtime-mounted", { coldStart: true });
    logNativeRuntimeDiagnostic("cold-start-detected", { coldStart: true });
    logNativeRuntimeDiagnostic("cold-start-resolution-start", { coldStart: true });

    if (window.location.pathname === "/login") {
      clearNativeLastRoute();
    }

    const routeTracker = createNativeRouteTracker();
    let disposed = false;
    let startupResolutionComplete = false;
    let pendingStartupPath: string | null = null;
    let lastHandledSafePath: string | null = null;
    let coldStartNavigationCompleted = false;
    let deepLinkHandled = false;
    let removeBackListener: (() => Promise<void>) | null = null;
    let removeUrlListener: (() => Promise<void>) | null = null;
    let removeStateListener: (() => Promise<void>) | null = null;

    const getDeepLinkRejectionReason = (url: string) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol !== "https:" || parsed.hostname !== "teachix.sa"
          ? "EXTERNAL_ROUTE"
          : "INVALID_ROUTE";
      } catch {
        return "INVALID_ROUTE";
      }
    };

    const handleIncomingUrl = (url: string, options?: { coldStart?: boolean }) => {
      const pathnameBefore = window.location.pathname;
      let safePath: string | null = null;

      try {
        safePath = getSafeNativeDeepLinkPath(url);
      } catch (error) {
        logNativeRuntimeDiagnostic("native-runtime-error", {
          errorCode: "NATIVE_DEEP_LINK_PARSE_ERROR",
          message: safeDiagnosticMessage(error),
          context: options?.coldStart ? "cold-start" : "warm-app-url",
          coldStart: Boolean(options?.coldStart),
        });
      }

      logNativeRuntimeDiagnostic("deep-link-parsed", {
        safePath,
        pathnameBefore,
        allowed: Boolean(safePath),
        coldStart: Boolean(options?.coldStart),
      });

      if (!safePath) {
        logNativeRuntimeDiagnostic("deep-link-rejected", {
          allowed: false,
          rejectionReason: getDeepLinkRejectionReason(url),
          coldStart: Boolean(options?.coldStart),
        });
        return false;
      }

      if (!options?.coldStart && !startupResolutionComplete) {
        pendingStartupPath = safePath;
        logNativeRuntimeDiagnostic("warm-app-url-received", {
          safePath,
          coldStart: true,
        });
        logNativeRuntimeDiagnostic("cold-start-app-url-suppressed", {
          safePath,
          coldStart: true,
        });
        return true;
      }

      if (lastHandledSafePath === safePath) {
        logNativeRuntimeDiagnostic("duplicate-deep-link-skipped", {
          safePath,
          coldStart: Boolean(options?.coldStart),
        });
        return true;
      }

      if (!options?.coldStart) {
        logNativeRuntimeDiagnostic("warm-app-url-received", {
          safePath,
          coldStart: false,
        });
      }

      lastHandledSafePath = safePath;
      pendingStartupPath = null;
      deepLinkHandled = true;
      logNativeRuntimeDiagnostic("deep-link-navigation-start", {
        safePath,
        pathnameBefore,
        coldStart: Boolean(options?.coldStart),
      });

      try {
        if (options?.coldStart) {
          coldStartNavigationCompleted = true;
          window.location.replace(safePath);
          logNativeRuntimeDiagnostic("cold-start-launch-url-handled", {
            safePath,
            coldStart: true,
          });
        } else {
          navigateNativeDeepLink(safePath);
        }

        logNativeRuntimeDiagnostic("deep-link-navigation-complete-attempt", {
          safePath,
          pathnameAfter: window.location.pathname,
          coldStart: Boolean(options?.coldStart),
        });
      } catch (error) {
        logNativeRuntimeDiagnostic("native-runtime-error", {
          errorCode: "NATIVE_DEEP_LINK_NAVIGATION_ERROR",
          message: safeDiagnosticMessage(error),
          context: options?.coldStart ? "cold-start" : "warm-app-url",
          safePath,
          coldStart: Boolean(options?.coldStart),
        });
      }

      return true;
    };

    void App.addListener("backButton", () => {
      const meaningfulInternalHistory = routeTracker.canGoBack();
      logNativeRuntimeDiagnostic("back-button-received", { meaningfulInternalHistory });

      try {
        if (meaningfulInternalHistory) {
          logNativeRuntimeDiagnostic("back-navigation-history", {
            meaningfulInternalHistory: true,
          });
          window.history.back();
          return;
        }

        logNativeRuntimeDiagnostic("back-at-root", { meaningfulInternalHistory: false });
        logNativeRuntimeDiagnostic("app-exit-requested", {
          reason: "NO_INTERNAL_HISTORY",
        });
        void App.exitApp();
      } catch (error) {
        logNativeRuntimeDiagnostic("native-runtime-error", {
          errorCode: "NATIVE_BACK_HANDLER_ERROR",
          message: safeDiagnosticMessage(error),
          context: "backButton",
        });
      }
    }).then((handle) => {
      if (disposed) {
        void handle.remove();
      } else {
        removeBackListener = () => handle.remove();
      }
    }).catch((error) => {
      logNativeRuntimeDiagnostic("native-runtime-error", {
        errorCode: "NATIVE_APP_LISTENER_ERROR",
        message: safeDiagnosticMessage(error),
        context: "backButton",
      });
    });

    void (async () => {
      const urlHandle = await App.addListener("appUrlOpen", ({ url }) => {
        handleIncomingUrl(url);
      });

      if (disposed) {
        void urlHandle.remove();
      } else {
        removeUrlListener = () => urlHandle.remove();
      }

      let launchUrl: Awaited<ReturnType<typeof App.getLaunchUrl>>;
      try {
        launchUrl = await App.getLaunchUrl();
      } catch (error) {
        logNativeRuntimeDiagnostic("native-runtime-error", {
          errorCode: "NATIVE_LAUNCH_URL_ERROR",
          message: safeDiagnosticMessage(error),
          context: "getLaunchUrl",
          coldStart: true,
        });
        launchUrl = undefined;
      }

      const launchSafePath = launchUrl?.url ? getSafeNativeDeepLinkPath(launchUrl.url) : null;
      if (launchUrl?.url) {
        logNativeRuntimeDiagnostic("launch-url-received", {
          safePath: launchSafePath,
          allowed: Boolean(launchSafePath),
          coldStart: true,
        });
      } else {
        logNativeRuntimeDiagnostic("launch-url-missing", { coldStart: true });
      }

      const coldPath = launchSafePath || pendingStartupPath;
      if (coldPath && !coldStartNavigationCompleted) {
        handleIncomingUrl(`https://teachix.sa${coldPath}`, { coldStart: true });
      }

      startupResolutionComplete = true;
      logNativeRuntimeDiagnostic("warm-listener-enabled", { coldStart: false });

      if (deepLinkHandled) {
        logNativeRuntimeDiagnostic("restore-skipped", {
          reason: "DEEP_LINK_HAS_PRIORITY",
          skipped: true,
          coldStart: true,
        });
      } else if (window.location.pathname !== "/dashboard") {
        logNativeRuntimeDiagnostic("restore-skipped", {
          reason: "NOT_DASHBOARD_ROOT",
          skipped: true,
          coldStart: true,
        });
      } else {
        const lastRoute = readNativeLastRoute();
        if (lastRoute && lastRoute !== window.location.pathname) {
          window.location.replace(lastRoute);
          logNativeRuntimeDiagnostic("last-route-restored", { safePath: lastRoute });
        } else {
          logNativeRuntimeDiagnostic("restore-skipped", {
            reason: "NO_STORED_ROUTE",
            skipped: true,
            coldStart: true,
          });
        }
      }
    })().catch((error) => {
      logNativeRuntimeDiagnostic("native-runtime-error", {
        errorCode: "NATIVE_LAUNCH_URL_ERROR",
        message: safeDiagnosticMessage(error),
        context: "launch-url-and-restore",
        coldStart: true,
      });
    });

    void App.addListener("appStateChange", ({ isActive }) => {
      logNativeRuntimeDiagnostic(isActive ? "app-resumed" : "app-paused", {
        appState: isActive ? "active" : "background",
      });
    }).then((handle) => {
      if (disposed) {
        void handle.remove();
      } else {
        removeStateListener = () => handle.remove();
      }
    }).catch((error) => {
      logNativeRuntimeDiagnostic("native-runtime-error", {
        errorCode: "NATIVE_APP_LISTENER_ERROR",
        message: safeDiagnosticMessage(error),
        context: "appStateChange",
      });
    });

    const applyStatusBar = () => {
      const isDark = document.documentElement.classList.contains("dark");
      void StatusBar.setOverlaysWebView({ overlay: false });
      void StatusBar.setBackgroundColor({ color: isDark ? "#07111F" : "#FFFFFF" });
      void StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
    };

    applyStatusBar();
    const observer = new MutationObserver(applyStatusBar);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      disposed = true;
      routeTracker.destroy();
      observer.disconnect();
      if (removeBackListener) void removeBackListener();
      if (removeUrlListener) void removeUrlListener();
      if (removeStateListener) void removeStateListener();
    };
  }, []);

  return null;
}
