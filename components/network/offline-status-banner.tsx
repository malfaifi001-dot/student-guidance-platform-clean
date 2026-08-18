"use client";

import { useEffect, useState } from "react";

export function OfflineStatusBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 z-[205] flex justify-center px-4" style={{ top: "max(0.75rem, env(safe-area-inset-top))" }} dir="rtl">
      <div role="status" aria-live="polite" className="pointer-events-auto w-full max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-black text-amber-900 shadow-xl dark:border-amber-900/60 dark:bg-amber-950/80 dark:text-amber-100">
        لا يوجد اتصال بالإنترنت. ستتمكن من المتابعة بعد عودة الاتصال.
      </div>
    </div>
  );
}
