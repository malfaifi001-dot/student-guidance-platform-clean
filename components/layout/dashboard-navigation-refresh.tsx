"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const DASHBOARD_REFRESH_EVENT = "dashboard:navigation-refresh";

export function DashboardNavigationRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const lastPathnameRef = useRef(pathname);
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    function requestRefresh(reason: string) {
      const now = Date.now();

      if (now - lastRefreshAtRef.current < 700) {
        return;
      }

      lastRefreshAtRef.current = now;

      window.dispatchEvent(
        new CustomEvent(DASHBOARD_REFRESH_EVENT, {
          detail: {
            reason,
            pathname: window.location.pathname,
            at: now,
          },
        }),
      );

      router.refresh();
    }

    if (lastPathnameRef.current !== pathname) {
      lastPathnameRef.current = pathname;
      requestRefresh("pathname-change");
    }

    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        requestRefresh("bfcache-pageshow");
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        requestRefresh("visibility-visible");
      }
    }

    function handleFocus() {
      requestRefresh("window-focus");
    }

    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [pathname, router]);

  return null;
}