"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { PrintExportPopCard } from "@/components/print-export/print-export-pop-card";
import type { PrintExportModal } from "@/lib/print-export/print-export-types";

const READY_SELECTOR = '[data-portfolio-pdf-ready="true"]';
const FAILURE_TIMEOUT_MS = 60_000;
const COMPLETION_DELAY_MS = 450;

export function PortfolioPreviewLoadingBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(() => pathname.includes("/portfolio/preview"));
  const [session, setSession] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const runId = useRef(0);
  const readyRef = useRef(false);
  useEffect(() => {
    const start = () => {
      runId.current += 1;
      readyRef.current = false;
      setActive(true); setReady(false); setFailed(false); setDismissed(false); setProgress(0); setSession((current) => current + 1);
    };
    window.addEventListener("portfolio-preview-start", start);
    if (pathname.includes("/portfolio/preview")) start();
    else setActive(false);
    return () => window.removeEventListener("portfolio-preview-start", start);
  }, [pathname]);

  useEffect(() => {
    if (!active) return;
    const currentRun = runId.current;
    const startedAt = performance.now();
    let completionTimer: number | null = null;
    const progressTimer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 94 || ready) return current;
        const elapsed = performance.now() - startedAt;
        return Math.min(94, Math.max(current, Math.round(94 * (1 - Math.exp(-elapsed / 6500)))));
      });
    }, 120);

    const finish = () => {
      if (currentRun !== runId.current || readyRef.current) return;
      readyRef.current = true;
      setReady(true);
      setProgress(100);
      completionTimer = window.setTimeout(() => setDismissed(true), COMPLETION_DELAY_MS);
    };

    const checkReady = () => {
      if (document.querySelector(READY_SELECTOR)) finish();
    };

    checkReady();
    const observer = new MutationObserver(checkReady);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-portfolio-pdf-ready", "data-portfolio-smart-phase"] });
    const failureTimer = window.setTimeout(() => {
      if (!ready && !document.querySelector(READY_SELECTOR)) setFailed(true);
    }, FAILURE_TIMEOUT_MS);

    return () => {
      window.clearInterval(progressTimer);
      window.clearTimeout(failureTimer);
      if (completionTimer !== null) window.clearTimeout(completionTimer);
      observer.disconnect();
    };
  }, [active, session]);

  const modal: PrintExportModal | null = !active || dismissed ? null : failed ? {
    status: "error",
    title: "تعذر تجهيز المعاينة",
    message: "استغرق تجهيز ملف الإنجاز وقتًا أطول من المتوقع. يمكنك إغلاق هذه الرسالة والمحاولة مرة أخرى.",
  } : {
    status: "loading",
    title: "جاري تحضير المعاينة",
    message: "يتم الآن تجهيز صفحات ملف الإنجاز، الرجاء الانتظار...",
    progress: ready ? 100 : progress,
  };

  return <>
    {children}
    {modal ? <PrintExportPopCard align="center" modal={modal} onClose={() => setDismissed(true)} onOpenFallback={() => undefined} /> : null}
  </>;
}
