"use client";

import { Download, Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { PrintExportPopCard } from "@/components/print-export/print-export-pop-card";
import { isCompletePortfolioPrintTarget } from "@/lib/print-export/print-export-contract";

type PreviewState = "preparing" | "ready" | "error";

// This is a bounded failure guard, not a delay before printing. The existing
// PortfolioPrintDocument marker is the only condition that permits printing.
const READINESS_TIMEOUT_MS = 60_000;

function isReady(target: Element) {
  // PortfolioPrintDocument owns these attributes on its inner, frozen root.
  // The route <main> is only the isolated container and is not itself proof
  // that all physical pages have been rendered.
  const documentRoot = target.querySelector<HTMLElement>(
    "[data-portfolio-physical-page-count]",
  );
  if (!documentRoot) return false;

  const requiredPageCount = Number(
    documentRoot.getAttribute("data-portfolio-physical-page-count") || "0",
  );
  const pageCount = documentRoot.querySelectorAll(
    "[data-portfolio-page-type], .portfolio-page, .atlas-page, .hzn-page, .moe24-page",
  ).length;

  return isCompletePortfolioPrintTarget({
    targetKind: target.getAttribute("data-portfolio-print-target"),
    ready: documentRoot.getAttribute("data-portfolio-pdf-ready") === "true",
    pageCount,
    requiredPageCount,
    snapshotId: target.getAttribute("data-portfolio-snapshot-id"),
    containsApplicationUi: Boolean(
      target.querySelector(
        "[data-portfolio-application-ui], [data-portfolio-modal], [data-portfolio-dashboard-ui]",
      ),
    ),
  });
}

export function PortfolioPrintPreviewController({
  autoPrint,
  downloadUrl,
}: {
  autoPrint: boolean;
  downloadUrl?: string;
}) {
  const [state, setState] = useState<PreviewState>("preparing");
  const [retryNonce, setRetryNonce] = useState(0);
  const printedRef = useRef(false);

  useEffect(() => {
    const target = document.querySelector<HTMLElement>(
      '[data-portfolio-print-target="portfolio"]',
    );
    if (!target) {
      window.queueMicrotask(() => setState("error"));
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

      // The state update removes the Pop Card before the browser print call.
      // requestAnimationFrame yields one paint opportunity without adding an
      // arbitrary readiness delay or printing before the frozen document is ready.
      if (autoPrint && !printedRef.current) {
        printedRef.current = true;
        window.requestAnimationFrame(() => {
          if (disposed) return;
          try {
            window.print();
          } catch {
            // A manual retry remains available if an embedded WebView rejects it.
            printedRef.current = false;
            setState("error");
          }
        });
      }
    };

    const observer = new MutationObserver(finish);
    observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "data-portfolio-pdf-ready",
        "data-portfolio-physical-page-count",
        "data-portfolio-smart-phase",
      ],
    });
    finish();

    return () => {
      disposed = true;
      observer.disconnect();
      window.clearTimeout(timeoutId);
    };
  }, [autoPrint, retryNonce]);

  const modal =
    state === "preparing"
      ? {
          status: "loading" as const,
          title: "جار تجهيز ملف الإنجاز",
          message:
            "يرجى الانتظار، يتم تجهيز الصفحات للطباعة أو الحفظ بصيغة PDF.",
        }
      : state === "error"
        ? {
            status: "error" as const,
            title: "تعذر تجهيز مستند الطباعة",
            message:
              "لم تكتمل صفحات ملف الإنجاز للطباعة. يمكنك إعادة المحاولة أو استخدام تحميل PDF.",
          }
        : null;

  return (
    <>
      <PrintExportPopCard
        align="center"
        modal={modal}
        onClose={() => {
          if (state === "error") setState("ready");
        }}
        onOpenFallback={() => undefined}
        downloadUrl={downloadUrl}
      />
      <div className="portfolio-print-preview-controls print:hidden" dir="rtl">
        {state === "preparing" ? (
          <p className="sr-only" role="status">
            جار تجهيز مستند الطباعة. سيفتح مربع الطباعة تلقائياً بعد اكتمال الصفحات.
          </p>
        ) : null}
        {state === "error" ? (
          <p className="mb-2 text-sm font-bold text-red-700" role="alert">
            تعذر تجهيز مستند الطباعة. أعد المحاولة أو استخدم تحميل PDF.
          </p>
        ) : null}
        <button
          type="button"
          disabled={state === "preparing"}
          onClick={() =>
            state === "error"
              ? setRetryNonce((value) => value + 1)
              : window.print()
          }
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Printer className="h-4 w-4" />
          {state === "error" ? "إعادة المحاولة" : "طباعة / حفظ PDF"}
        </button>
        {state === "error" && downloadUrl ? (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="ms-2 inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-700"
          >
            <Download className="h-4 w-4" />
            تحميل PDF
          </a>
        ) : null}
      </div>
    </>
  );
}
