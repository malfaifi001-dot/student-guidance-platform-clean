"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
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

    if (window.location.pathname === "/login") {
      clearNativeLastRoute();
    }

    const routeTracker = createNativeRouteTracker();
    let disposed = false;
    let removeBackListener: (() => Promise<void>) | null = null;
    let removeUrlListener: (() => Promise<void>) | null = null;
    let deepLinkHandled = false;

    const handleIncomingUrl = (url: string, options?: { coldStart?: boolean }) => {
      const pathnameBeforeHandling = window.location.pathname;
      const path = getSafeNativeDeepLinkPath(url);
      console.info("NATIVE_DEEP_LINK_DEBUG", {
        event: options?.coldStart ? "cold-start-url-before-handling" : "warm-url-before-handling",
        pathnameBeforeHandling,
        safePath: path,
      });
      if (!path) return false;

      deepLinkHandled = true;
      console.info("NATIVE_DEEP_LINK_DEBUG", {
        event: "deepLinkHandled-updated",
        deepLinkHandled,
        safePath: path,
      });
      if (options?.coldStart) {
        console.info("NATIVE_DEEP_LINK_DEBUG", {
          event: "window.location.replace-called",
          safePath: path,
        });
        window.location.replace(path);
      } else {
        navigateNativeDeepLink(path);
      }
      return true;
    };

    void App.addListener("backButton", () => {
      if (routeTracker.canGoBack()) {
        window.history.back();
        return;
      }

      void App.exitApp();
    }).then((handle) => {
      if (disposed) {
        void handle.remove();
      } else {
        removeBackListener = () => handle.remove();
      }
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

      const launchUrl = await App.getLaunchUrl().catch(() => undefined);
      const launchSafePath = launchUrl?.url ? getSafeNativeDeepLinkPath(launchUrl.url) : null;
      console.info("NATIVE_DEEP_LINK_DEBUG", {
        event: "getLaunchUrl-result",
        hasUrl: Boolean(launchUrl?.url),
        safePath: launchSafePath,
        pathnameBeforeHandling: window.location.pathname,
      });
      if (!deepLinkHandled && launchUrl?.url) {
        handleIncomingUrl(launchUrl.url, { coldStart: true });
      }

      const lastRouteRestoreSkipped = deepLinkHandled;
      console.info("NATIVE_DEEP_LINK_DEBUG", {
        event: "last-route-restore-decision",
        deepLinkHandled,
        lastRouteRestoreSkipped,
        pathname: window.location.pathname,
      });

      if (!lastRouteRestoreSkipped && window.location.pathname === "/dashboard") {
        const lastRoute = readNativeLastRoute();
        if (lastRoute && lastRoute !== window.location.pathname) {
          window.location.replace(lastRoute);
        }
      }
    })();

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
    };
  }, []);

  return null;
}
