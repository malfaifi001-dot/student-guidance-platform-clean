"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

export function NativeRuntimeSetup() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const applyStatusBar = () => {
      const isDark = document.documentElement.classList.contains("dark");
      void StatusBar.setOverlaysWebView({ overlay: false });
      void StatusBar.setBackgroundColor({ color: isDark ? "#07111F" : "#FFFFFF" });
      void StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
    };

    applyStatusBar();
    const observer = new MutationObserver(applyStatusBar);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  return null;
}

