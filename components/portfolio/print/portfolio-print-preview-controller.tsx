"use client";

import { Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { isCompletePortfolioPrintTarget } from "@/lib/print-export/print-export-contract";

type PreviewState = "preparing" | "ready" | "error";
const READINESS_TIMEOUT_MS = 20_000;

function isReady(target: Element) {
  // The readiness attributes belong to PortfolioPrintDocument's inner root,
  // not to the outer route <main> that owns data-portfolio-print-target.
  const documentRoot = target.querySelector<HTMLElement>("[data-portfolio-physical-page-count]");
  if (!documentRoot) return false;

  const requiredPageCount = Number(documentRoot.getAttribute("data-portfolio-physical-page-count") || "0");
  const pageCount = documentRoot.querySelectorAll("[data-portfolio-page-type], .portfolio-page, .atlas-page, .hzn-page, .moe24-page").length;
  return isCompletePortfolioPrintTarget({
    targetKind: target.getAttribute("data-portfolio-print-target"),
    ready: documentRoot.getAttribute("data-portfolio-pdf-ready") === "true",
    pageCount,
    requiredPageCount,
    snapshotId: target.getAttribute("data-portfolio-snapshot-id"),
    containsApplicationUi: Boolean(target.querySelector("[data-portfolio-application-ui], [data-portfolio-modal], [data-portfolio-dashboard-ui]")),
  });
}

export function PortfolioPrintPreviewController({ autoPrint }: { autoPrint: boolean }) {
  const [state, setState] = useState<PreviewState>("preparing");
  const [retryNonce, setRetryNonce] = useState(0);
  const printedRef = useRef(false);

  useEffect(() => {
    const target = document.querySelector<HTMLElement>('[data-portfolio-print-target="portfolio"]');
    if (!target) {
      setState("error");
      return;
    }

    let disposed = false;
    let printScheduled = false;
    const timeoutId = window.setTimeout(() => {
      if (!printScheduled && !disposed) setState("error");
    }, READINESS_TIMEOUT_MS);

    const finish = () => {
      if (disposed || printScheduled || !isReady(target)) return;
      if (typeof window.print !== "function") {
        setState("error");
        return;
      }

      printScheduled = true;
      observer.disconnect();
      setState("ready");
      if (autoPrint && !printedRef.current) {
        printedRef.current = true;
        window.requestAnimationFrame(() => {
          if (!disposed) window.print();
        });
      }
    };

    const observer = new MutationObserver(finish);
    observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-portfolio-pdf-ready", "data-portfolio-physical-page-count"],
    });
    finish();

    return () => {
      disposed = true;
      observer.disconnect();
      window.clearTimeout(timeoutId);
    };
  }, [autoPrint, retryNonce]);

  return (
    <div className="portfolio-print-preview-controls print:hidden" dir="rtl">
      {state === "preparing" ? <p role="status">جارٍ تجهيز مستند الطباعة...</p> : null}
      {state === "error" ? <p role="alert">تعذر تجهيز مستند الطباعة. حاول الطباعة مرة أخرى أو استخدم تحميل PDF.</p> : null}
      <button type="button" disabled={state === "preparing"} onClick={() => state === "error" ? setRetryNonce((value) => value + 1) : window.print()} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
        <Printer className="h-4 w-4" />
        {state === "error" ? "إعادة المحاولة" : "طباعة / حفظ PDF"}
      </button>
    </div>
  );
}
