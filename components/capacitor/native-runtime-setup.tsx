"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import {
  clearNativeLastRoute,
  createNativeRouteTracker,
  isNativeCapacitor,
  readNativeLastRoute,
} from "@/lib/native/native-runtime";

export function NativeRuntimeSetup() {
  useEffect(() => {
    if (!isNativeCapacitor()) return;

    const currentPath = window.location.pathname;
    if (currentPath === "/login") {
      clearNativeLastRoute();
    } else if (currentPath === "/dashboard") {
      const lastRoute = readNativeLastRoute();
      if (lastRoute && lastRoute !== currentPath) {
        window.location.replace(lastRoute);
        return;
      }
    }

    const routeTracker = createNativeRouteTracker();
    let disposed = false;
    let removeBackListener: (() => Promise<void>) | null = null;

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
    };
  }, []);

  return null;
}
