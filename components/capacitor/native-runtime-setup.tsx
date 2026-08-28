"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { App } from "@capacitor/app";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { StatusBar, Style } from "@capacitor/status-bar";
import {
  logNativeRuntimeDiagnostic,
  safeDiagnosticMessage,
} from "@/lib/native/native-runtime-diagnostics";
import {
  clearNativeLastRoute,
  createNativeRouteTracker,
  acquireNativeRuntime,
  getNativeDiagnosticPath,
  getNativeDeepLinkRejectionReason,
  getNativeRouteKind,
  getSafeNativeDeepLinkPath,
  isNativeCapacitor,
  navigateNativeDeepLink,
  readNativeLastRoute,
  releaseNativeRuntime,
} from "@/lib/native/native-runtime";
import {
  closeNativeOnboardingReview,
  isNativeOnboardingReviewOpen,
  publishNativeStartupReady,
} from "@/lib/native/native-onboarding";
import { isDashboardHomePath } from "@/lib/auth/dashboard-redirects";

export function NativeRuntimeSetup() {
  const [startupGateActive, setStartupGateActive] = useState(false);

  useLayoutEffect(() => {
    if (!isNativeCapacitor()) return;

    setStartupGateActive(true);
    logNativeRuntimeDiagnostic("startup-gate-activated", { coldStart: true });
  }, []);

  useEffect(() => {
    if (!isNativeCapacitor()) return;
    if (!acquireNativeRuntime()) {
      setStartupGateActive(false);
      return;
    }

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
    let removePushActionListener: (() => Promise<void>) | null = null;

    const releaseStartupGate = (reason: string) => {
      setStartupGateActive(false);
      logNativeRuntimeDiagnostic("startup-gate-released", {
        reason,
        coldStart: true,
      });
    };

    const handleIncomingUrl = (url: string, options?: { coldStart?: boolean }) => {
      const pathnameBefore = `${window.location.pathname}${window.location.search}`;
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
        safePath: safePath ? getNativeDiagnosticPath(safePath) : null,
        pathnameBefore: getNativeDiagnosticPath(pathnameBefore),
        allowed: Boolean(safePath),
        coldStart: Boolean(options?.coldStart),
      });

      if (!safePath) {
        logNativeRuntimeDiagnostic("deep-link-rejected", {
          allowed: false,
          rejectionReason: getNativeDeepLinkRejectionReason(url),
          coldStart: Boolean(options?.coldStart),
        });
        return false;
      }

      if (!options?.coldStart && !startupResolutionComplete) {
        pendingStartupPath = safePath;
        logNativeRuntimeDiagnostic("warm-app-url-received", {
          safePath: getNativeDiagnosticPath(safePath),
          coldStart: true,
        });
        logNativeRuntimeDiagnostic("cold-start-app-url-suppressed", {
          safePath: getNativeDiagnosticPath(safePath),
          coldStart: true,
        });
        return true;
      }

      if (lastHandledSafePath === safePath) {
        logNativeRuntimeDiagnostic("duplicate-deep-link-skipped", {
          safePath: getNativeDiagnosticPath(safePath),
          coldStart: Boolean(options?.coldStart),
        });
        return true;
      }

      if (!options?.coldStart) {
        logNativeRuntimeDiagnostic("warm-app-url-received", {
          safePath: getNativeDiagnosticPath(safePath),
          coldStart: false,
        });
      }

      lastHandledSafePath = safePath;
      pendingStartupPath = null;
      deepLinkHandled = true;
      logNativeRuntimeDiagnostic("deep-link-navigation-start", {
        safePath: getNativeDiagnosticPath(safePath),
        pathnameBefore: getNativeDiagnosticPath(pathnameBefore),
        coldStart: Boolean(options?.coldStart),
      });

      try {
        if (options?.coldStart) {
          coldStartNavigationCompleted = true;
          window.location.replace(safePath);
          logNativeRuntimeDiagnostic("cold-start-launch-url-handled", {
            safePath: getNativeDiagnosticPath(safePath),
            coldStart: true,
          });
        } else {
          navigateNativeDeepLink(safePath);
        }

        logNativeRuntimeDiagnostic("deep-link-navigation-complete-attempt", {
          safePath: getNativeDiagnosticPath(safePath),
          pathnameAfter: getNativeDiagnosticPath(window.location.pathname),
          coldStart: Boolean(options?.coldStart),
        });
      } catch (error) {
        logNativeRuntimeDiagnostic("native-runtime-error", {
          errorCode: "NATIVE_DEEP_LINK_NAVIGATION_ERROR",
          message: safeDiagnosticMessage(error),
          context: options?.coldStart ? "cold-start" : "warm-app-url",
          safePath: getNativeDiagnosticPath(safePath),
          coldStart: Boolean(options?.coldStart),
        });
      }

      return true;
    };

    const appUrlListenerPromise = App.addListener("appUrlOpen", ({ url }) => {
      handleIncomingUrl(url);
    });

    const pushActionListenerPromise = FirebaseMessaging.addListener("notificationActionPerformed", ({ notification }) => {
      const data = notification.data;
      const route = typeof data === "object" && data !== null && "route" in data
        ? (data as { route?: unknown }).route
        : undefined;
      const campaignId = typeof data === "object" && data !== null && "campaignId" in data
        ? (data as { campaignId?: unknown }).campaignId
        : undefined;
      if (typeof campaignId === "string" && campaignId.length > 0 && typeof route === "string") {
        void fetch("/api/dashboard/notifications/open", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId, route }),
        }).catch(() => undefined);
      }
      const url =
        typeof route === "string"
          ? route.startsWith("/")
            ? `https://teachix.sa${route}`
            : route
          : "";
      const accepted = handleIncomingUrl(url);

      logNativeRuntimeDiagnostic("push-notification-opened", {
        hasRoute: typeof route === "string" && route.length > 0,
        accepted,
      });

      if (!accepted) {
        logNativeRuntimeDiagnostic("push-route-rejected", {
          reason: "UNSAFE_OR_MISSING_ROUTE",
        });
        handleIncomingUrl("https://teachix.sa/dashboard");
      }
    });
    pushActionListenerPromise.then((handle) => {
      if (disposed) {
        void handle.remove();
      } else {
        removePushActionListener = () => handle.remove();
      }
    }).catch(() => {
      logNativeRuntimeDiagnostic("push-route-rejected", {
        reason: "ACTION_LISTENER_FAILED",
      });
    });

    void App.addListener("backButton", () => {
      if (isNativeOnboardingReviewOpen()) {
        closeNativeOnboardingReview();
        return;
      }

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
      logNativeRuntimeDiagnostic("startup-launch-resolution-start", {
        coldStart: true,
      });

      const urlHandle = await appUrlListenerPromise;

      if (disposed) {
        void urlHandle.remove();
      } else {
        removeUrlListener = () => urlHandle.remove();
      }

      await pushActionListenerPromise;

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
          safePath: launchSafePath ? getNativeDiagnosticPath(launchSafePath) : null,
          allowed: Boolean(launchSafePath),
          coldStart: true,
        });
      } else {
        logNativeRuntimeDiagnostic("launch-url-missing", { coldStart: true });
      }

      const coldPath = launchSafePath || pendingStartupPath;
      if (coldPath && !coldStartNavigationCompleted) {
        const currentRoute = `${window.location.pathname}${window.location.search}`;
        const serverResolvedDashboardPath =
          coldPath === "/dashboard" && isDashboardHomePath(window.location.pathname);

        if (currentRoute === coldPath || serverResolvedDashboardPath) {
          deepLinkHandled = true;
          lastHandledSafePath = coldPath;
          pendingStartupPath = null;
          coldStartNavigationCompleted = true;
          logNativeRuntimeDiagnostic("cold-start-already-at-target", {
            safePath: getNativeDiagnosticPath(coldPath),
            pathname: getNativeDiagnosticPath(window.location.pathname),
            serverResolvedDashboardPath,
            coldStart: true,
          });
          logNativeRuntimeDiagnostic("cold-start-launch-complete", {
            safePath: getNativeDiagnosticPath(coldPath),
            pathname: getNativeDiagnosticPath(window.location.pathname),
            coldStart: true,
          });
          releaseStartupGate("ALREADY_AT_TARGET");
        } else if (
          getNativeRouteKind(coldPath) === "DASHBOARD_APP_ROUTE" &&
          window.location.pathname === "/login"
        ) {
          deepLinkHandled = true;
          lastHandledSafePath = coldPath;
          pendingStartupPath = null;
          coldStartNavigationCompleted = true;
          releaseStartupGate("AUTH_REDIRECT_ALLOWED");
        } else {
          logNativeRuntimeDiagnostic("startup-gate-held-for-navigation", {
            reason:
              getNativeRouteKind(coldPath) === "PUBLIC_TOKEN_ROUTE"
                ? "PUBLIC_DEEP_LINK"
                : "DASHBOARD_DEEP_LINK",
            safePath: getNativeDiagnosticPath(coldPath),
            coldStart: true,
          });
          handleIncomingUrl(`https://teachix.sa${coldPath}`, { coldStart: true });
        }
      }

      startupResolutionComplete = true;
      logNativeRuntimeDiagnostic("startup-launch-resolution-complete", {
        hasLaunchPath: Boolean(coldPath),
        coldStart: true,
      });
      logNativeRuntimeDiagnostic("warm-listener-enabled", { coldStart: false });

      if (deepLinkHandled) {
        publishNativeStartupReady(true);
        logNativeRuntimeDiagnostic("restore-skipped", {
          reason: "DEEP_LINK_HAS_PRIORITY",
          skipped: true,
          coldStart: true,
        });
      } else if (window.location.pathname !== "/dashboard") {
        releaseStartupGate("NOT_DASHBOARD_ROOT");
        publishNativeStartupReady(false);
        logNativeRuntimeDiagnostic("restore-skipped", {
          reason: "NOT_DASHBOARD_ROOT",
          skipped: true,
          coldStart: true,
        });
      } else {
        const lastRoute = readNativeLastRoute();
        const currentRoute = `${window.location.pathname}${window.location.search}`;
        if (lastRoute && lastRoute !== currentRoute) {
          logNativeRuntimeDiagnostic("startup-gate-held-for-navigation", {
            reason: "LAST_ROUTE_RESTORE",
            safePath: lastRoute,
            coldStart: true,
          });
          window.location.replace(lastRoute);
          logNativeRuntimeDiagnostic("last-route-restored", { safePath: lastRoute });
        } else {
          releaseStartupGate("NO_LAUNCH_URL");
          publishNativeStartupReady(false);
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
      releaseStartupGate("LAUNCH_RESOLUTION_ERROR");
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
      void StatusBar.setBackgroundColor({ color: isDark ? "#07111F" : "#F8FAFC" });
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
      if (removePushActionListener) void removePushActionListener();
      releaseNativeRuntime();
    };
  }, []);

  return (
    <div
      aria-hidden={!startupGateActive}
      data-native-startup-gate="true"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#1769FF] transition-opacity duration-150"
      style={{
        opacity: startupGateActive ? 1 : 0,
        pointerEvents: startupGateActive ? "auto" : "none",
        visibility: startupGateActive ? "visible" : "hidden",
      }}
    >
      <div className="flex flex-col items-center" aria-label="Teachix">
        <svg
          aria-hidden="true"
          viewBox="0 0 108 108"
          className="h-28 w-28"
          fill="none"
        >
          <path
            d="M54 12a42 42 0 1 0 0 84 42 42 0 1 0 0-84Zm0 12a30 30 0 1 1 0 60 30 30 0 1 1 0-60Zm0 12a18 18 0 1 0 0 36 18 18 0 1 0 0-36Zm0 10a8 8 0 1 1 0 16 8 8 0 1 1 0-16Z"
            fill="white"
            fillRule="evenodd"
          />
        </svg>
        <p
          dir="auto"
          className="mt-5 whitespace-nowrap text-center font-sans text-base font-semibold tracking-wide text-white"
        >
          Teachix | الأسهل والأشمل
        </p>
      </div>
    </div>
  );
}
