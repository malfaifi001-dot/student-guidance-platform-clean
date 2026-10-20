"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildPrintUrl,
  downloadBlobAsFile,
  readResponseBlob,
  startDirectBrowserDownload,
} from "@/lib/print-export/print-export-download";
import type {
  PrintExportActionOptions,
  PrintExportFallback,
  PrintExportModal,
  PrintExportRunResult,
  PrintExportStatus,
} from "@/lib/print-export/print-export-types";
import { trackAnalyticsEvent } from "@/lib/analytics/analytics-client";
import { isNativeCapacitor } from "@/lib/native/native-runtime";
import { isCompletePortfolioPrintTarget } from "@/lib/print-export/print-export-contract";
import { formatTransferSize, getDownloadProgress } from "@/lib/print-export/print-export-progress";
import { getTransferMetrics, type TransferSample } from "@/lib/print-export/print-export-transfer";
import {
  openNativeBrowserDownload,
  savePrintPreviewAsNativePdf,
  shareBlobAsNativeFile,
} from "@/lib/native/native-download";

function getPrintExportFallbackUrl(
  payload: unknown,
  explicitPrintUrl?: string,
): string {
  if (explicitPrintUrl) {
    return explicitPrintUrl;
  }

  if (!payload || typeof payload !== "object") {
    return "";
  }

  const record = payload as Record<string, unknown>;
  const directCandidates = [
    record.previewUrl,
    record.printUrl,
    record.fallbackUrl,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  if (
    record.fallback === "PRINT_PREVIEW" &&
    typeof record.previewUrl === "string" &&
    record.previewUrl.trim()
  ) {
    return record.previewUrl;
  }

  return "";
}

function buildRequestBody(body: unknown) {
  if (body === undefined) {
    return undefined;
  }

  if (body instanceof FormData) {
    return body;
  }

  return JSON.stringify(body);
}

const PREPARED_PRINT_TIMEOUT_MS = 12_000;

function isEmbeddedWebView() {
  if (typeof navigator === "undefined") return false;
  const userAgent = navigator.userAgent || "";
  return /; wv\)|\bwv\b|\bWebView\b/i.test(userAgent) && !/Chrome\/|CriOS\/|EdgA\//i.test(userAgent);
}

function waitWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error("PRINT_ASSET_TIMEOUT")), timeoutMs);
    }),
  ]);
}

async function waitForPreparedPrintDocument(options: NonNullable<PrintExportActionOptions["preparedPrint"]>) {
  if (typeof window === "undefined" || typeof document === "undefined" || typeof window.print !== "function") return false;
  if (isEmbeddedWebView()) return false;

  const timeoutMs = Math.max(1_000, options.timeoutMs || PREPARED_PRINT_TIMEOUT_MS);
  const root = document.querySelector(options.rootSelector);
  if (!root) return false;
  if (root.getAttribute("data-portfolio-print-target") !== "portfolio") return false;
  if (options.expectedSnapshotId && root.getAttribute("data-portfolio-snapshot-id") !== options.expectedSnapshotId) return false;

  try {
    const hasCompleteDocument = () => isCompletePortfolioPrintTarget({
      targetKind: root.getAttribute("data-portfolio-print-target"),
      ready: Boolean(root.querySelector(options.readySelector)),
      pageCount: root.querySelectorAll(options.pageSelector).length,
      requiredPageCount: options.requiredPageCount,
      snapshotId: root.getAttribute("data-portfolio-snapshot-id"),
      expectedSnapshotId: options.expectedSnapshotId,
      containsApplicationUi: Boolean(root.querySelector("[data-portfolio-application-ui], [data-portfolio-modal], [data-portfolio-dashboard-ui]")),
    });
    if (!hasCompleteDocument()) {
      await waitWithTimeout(new Promise<void>((resolve, reject) => {
        const observer = new MutationObserver(() => {
          if (hasCompleteDocument()) {
            observer.disconnect();
            resolve();
          }
        });
        observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-portfolio-pdf-ready"] });
        window.setTimeout(() => {
          observer.disconnect();
          reject(new Error("PRINT_DOCUMENT_NOT_READY"));
        }, timeoutMs);
      }), timeoutMs);
    }
    if (document.fonts?.ready) await waitWithTimeout(document.fonts.ready, timeoutMs);
    const images = Array.from(root.querySelectorAll("img"));
    await waitWithTimeout(Promise.all(images.map(async (image) => {
      if (image.complete) {
        if (image.naturalWidth === 0 && image.src) throw new Error("PRINT_IMAGE_FAILED");
        return;
      }
      await new Promise<void>((resolve, reject) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => reject(new Error("PRINT_IMAGE_FAILED")), { once: true });
      });
    })), timeoutMs);
    return true;
  } catch {
    return false;
  }
}

const PORTFOLIO_DOWNLOAD_TRACE_ENABLED =
  process.env.NEXT_PUBLIC_PORTFOLIO_DOWNLOAD_TRACE === "1";

function portfolioDownloadTrace(
  stage: string,
  details: Record<string, unknown> = {},
) {
  if (!PORTFOLIO_DOWNLOAD_TRACE_ENABLED) return;
  console.info("[PORTFOLIO_DOWNLOAD]", {
    stage,
    timestamp: new Date().toISOString(),
    ...details,
  });
}

function portfolioDownloadPathname(url: string) {
  try {
    const pathname = new URL(url, window.location.origin).pathname;
    return pathname.replace(
      /^\/api\/dashboard\/portfolio\/[^/]+\/export\/pdf$/,
      "/api/dashboard/portfolio/[portfolioId]/export/pdf",
    );
  } catch {
    return "";
  }
}

function getTrustedContentLength(response: Response) {
  const value = response.headers.get("content-length");
  if (!value || !/^\d+$/.test(value)) return null;
  const length = Number(value);
  return Number.isSafeInteger(length) && length >= 0 ? length : null;
}

async function waitForPersistedPdfReady(
  exportUrl: string,
  pending: NonNullable<PrintExportActionOptions["pendingDownload"]>,
  publish: (update: Pick<PrintExportModal, "progress" | "receivedBytes" | "totalBytes" | "speedBytesPerSecond" | "remainingSeconds" | "phase" | "message">) => void,
  signal: AbortSignal,
) {
  const timeoutMs = Math.max(30_000, pending.timeoutMs || 15 * 60_000);
  const pollIntervalMs = Math.max(500, pending.pollIntervalMs || 2_000);
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (signal.aborted) throw new Error("PRINT_EXPORT_CANCELLED");
    const probe = await fetch(exportUrl, { method: "HEAD", credentials: "same-origin", cache: "no-store", signal });
    if (probe.ok && (probe.headers.get("content-type") || "").includes("application/pdf")) {
      const totalBytes = getTrustedContentLength(probe);
      publish({ progress: undefined, receivedBytes: 0, totalBytes, speedBytesPerSecond: null, remainingSeconds: null, phase: "ready", message: totalBytes === null ? "PDF جاهز — الحجم غير متاح بعد. سيبدأ المتصفح التنزيل." : `PDF جاهز — ${totalBytes} بايت. سيبدأ المتصفح التنزيل.` });
      return totalBytes;
    }

    if (probe.status !== 202) {
      throw new Error("PORTFOLIO_PDF_PREPARATION_FAILED");
    }

    const statusResponse = await fetch(pending.statusUrl, { credentials: "same-origin", cache: "no-store", signal });
    const payload = await statusResponse.json().catch(() => ({})) as { pdf?: { status?: string; byteSize?: number | null }; status?: string };
    const pdfStatus = payload.pdf?.status || payload.status;
    const byteSize = typeof payload.pdf?.byteSize === "number" ? payload.pdf.byteSize : null;
    if (pdfStatus === "READY") {
      publish({ progress: undefined, receivedBytes: 0, totalBytes: byteSize, speedBytesPerSecond: null, remainingSeconds: null, phase: "ready", message: byteSize === null ? "PDF جاهز — الحجم غير متاح بعد. سيبدأ المتصفح التنزيل." : `PDF جاهز — ${byteSize} بايت. سيبدأ المتصفح التنزيل.` });
      return byteSize;
    }
    if (pdfStatus === "FAILED") throw new Error("PORTFOLIO_PDF_PREPARATION_FAILED");

    publish({ progress: undefined, receivedBytes: 0, totalBytes: byteSize, speedBytesPerSecond: null, remainingSeconds: null, phase: "preparing", message: "جار تجهيز PDF — سيبدأ التنزيل تلقائيًا عند اكتماله." });
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(resolve, pollIntervalMs);
      signal.addEventListener("abort", () => {
        window.clearTimeout(timeout);
        reject(new Error("PRINT_EXPORT_CANCELLED"));
      }, { once: true });
    });
  }

  throw new Error("PORTFOLIO_PDF_PREPARATION_TIMEOUT");
}

export function usePrintExportAction() {
  const [status, setStatus] = useState<PrintExportStatus>("idle");
  const [modal, setModal] = useState<PrintExportModal | null>(null);
  const directDownloadAbortRef = useRef<AbortController | null>(null);

  const stopProgress = useCallback(() => {
    // Progress is driven by the actual export lifecycle. There is no timer-based estimate.
  }, []);

  const publishProgress = useCallback((update: Pick<PrintExportModal, "progress" | "receivedBytes" | "totalBytes" | "speedBytesPerSecond" | "remainingSeconds" | "phase"> & { message?: string }) => {
    setModal((current) =>
      current?.status === "loading" ? { ...current, ...update } : current,
    );
  }, []);

  const startProgress = useCallback(() => {
    stopProgress();
  }, [stopProgress]);

  const finishProgress = useCallback(async () => {
    stopProgress();
  }, [stopProgress]);

  const closeModal = useCallback(() => {
    directDownloadAbortRef.current?.abort();
    directDownloadAbortRef.current = null;
    stopProgress();
    setModal(null);
    setStatus("idle");
  }, [stopProgress]);

  useEffect(() => () => {
    directDownloadAbortRef.current?.abort();
    stopProgress();
  }, [stopProgress]);

  const openFallbackPrintUrl = useCallback(
    async (
      fallback?: PrintExportFallback | null,
      analytics?: PrintExportActionOptions["analytics"],
    ): Promise<PrintExportRunResult> => {
      const targetUrl = buildPrintUrl(fallback?.printUrl || "");

      if (!targetUrl) {
        stopProgress();
        setStatus("error");
        setModal({
          status: "error",
          title: fallback?.title || "معاينة الطباعة",
          message:
            fallback?.message ||
            "تعذر فتح معاينة الطباعة. حاول مرة أخرى.",
        });
        return "error";
      }

      if (isNativeCapacitor()) {
        try {
          const opened = await savePrintPreviewAsNativePdf(
            targetUrl,
            fallback?.fileName || "report.pdf",
          );
          if (!opened) throw new Error("PRINT_PREVIEW_OPEN_FAILED");
          await finishProgress();
          setStatus("success");
          setModal(null);
        } catch {
          stopProgress();
          setStatus("error");
          setModal({
            status: "error",
            title: fallback?.title || "تصدير PDF",
            message: "تعذر إنشاء ملف PDF محليًا. حاول مرة أخرى.",
          });
          return "error";
        }
        if (analytics) {
          trackAnalyticsEvent(analytics.eventName, analytics.params);
        }
        return "downloaded";
      }

      const popup = window.open(targetUrl, "_blank", "noopener,noreferrer");

      if (!popup) {
        stopProgress();
        setStatus("blocked");
        setModal({
          status: "blocked",
          title: fallback?.title || "معاينة الطباعة",
          message:
            fallback?.message ||
            "تم حظر فتح نافذة المعاينة تلقائياً. استخدم الزر أدناه لفتح معاينة الطباعة.",
            fallback: {
              printUrl: targetUrl,
              fileName: fallback?.fileName,
              title: fallback?.title,
            message: fallback?.message,
          },
        });
        return "blocked";
      }

      await finishProgress();
      setStatus("success");
      setModal(null);
      if (analytics) {
        trackAnalyticsEvent(analytics.eventName, analytics.params);
      }
      return "opened";
    },
    [finishProgress, stopProgress],
  );

  const runPrintExport = useCallback(
    async (options: PrintExportActionOptions): Promise<PrintExportRunResult> => {
      const runController = new AbortController();
      directDownloadAbortRef.current?.abort();
      directDownloadAbortRef.current = runController;
      startProgress();
      setStatus("loading");
      setModal({
        status: "loading",
        progress: undefined,
        receivedBytes: 0,
        totalBytes: null,
        speedBytesPerSecond: null,
        remainingSeconds: null,
        phase: "preparing",
        title: options.progressTitle || "جاري تجهيز الملف",
        message: options.progressMessage || "يتم الآن تجهيز ملف التقرير للتحميل، الرجاء الانتظار...",
      });

      const fallbackMeta = {
        title: options.blockedTitle || "معاينة الطباعة",
        message:
          options.blockedMessage ||
          "تم حظر فتح نافذة المعاينة تلقائياً. استخدم الزر أدناه لفتح معاينة الطباعة.",
      };

      try {
        if (options.preparedPrint) {
          const prepared = await waitForPreparedPrintDocument(options.preparedPrint);
          if (prepared) {
            window.print();
            setStatus("success");
            setModal({
              status: "success",
              title: "تم فتح الطباعة",
              message: "تم فتح مستند ملف الإنجاز الكامل. يحفظ المتصفح الملف من نافذة الطباعة؛ لا يمكن للتطبيق قياس تقدم الحفظ الأصلي.",
            });
            if (options.analytics) {
              trackAnalyticsEvent(options.analytics.eventName, options.analytics.params);
            }
            return "opened";
          }
        }

        if (options.exportUrl) {
          let preparedByteSize: number | null = null;
          if (options.pendingDownload) {
            preparedByteSize = await waitForPersistedPdfReady(options.exportUrl, options.pendingDownload, (update) => {
              publishProgress(update);
              setModal((current) => current?.status === "loading" && update.message ? { ...current, message: update.message } : current);
            }, runController.signal);
          }

          if (options.deliveryMode === "direct" && !isNativeCapacitor()) {
            const exportUrl = options.exportUrl;
            const pathname = portfolioDownloadPathname(exportUrl);
            portfolioDownloadTrace("browser-download-handoff", { deliveryMode: "direct", native: false, pathname });
            publishProgress({ progress: undefined, receivedBytes: 0, totalBytes: preparedByteSize, speedBytesPerSecond: null, remainingSeconds: null, phase: "browser-handoff" });
            startDirectBrowserDownload(exportUrl);
            setStatus("success");
            setModal({ status: "success", title: "بدأ تنزيل PDF", message: preparedByteSize === null ? "تم تسليم الملف إلى مدير تنزيل المتصفح. الحجم غير متاح، ولا يستطيع التطبيق قياس سرعة أو اكتمال الحفظ الأصلي." : `PDF جاهز — ${formatTransferSize(preparedByteSize)}. تم تسليمه إلى مدير تنزيل المتصفح، ولا يستطيع التطبيق قياس اكتمال الحفظ الأصلي.` });
            if (options.analytics) {
              trackAnalyticsEvent(options.analytics.eventName, options.analytics.params);
            }
            return "opened";
          }

          if (options.nativeLargeFileFallbackUrl && isNativeCapacitor() && preparedByteSize !== null && preparedByteSize >= 50 * 1024 * 1024) {
            await openNativeBrowserDownload(options.nativeLargeFileFallbackUrl);
            setStatus("success");
            setModal({ status: "success", title: "بدأ تنزيل PDF", message: `PDF جاهز — ${formatTransferSize(preparedByteSize)}. تم فتح مدير المتصفح للنقل دون Blob أو Base64 داخل التطبيق.` });
            return "opened";
          }

          const requestBody = buildRequestBody(options.body);
          const response = await fetch(options.exportUrl, {
            method: options.method || (requestBody ? "POST" : "GET"),
            headers:
              requestBody && !(requestBody instanceof FormData)
                ? { "Content-Type": "application/json" }
                : undefined,
            body: requestBody,
          });

          const contentType = response.headers.get("content-type") || "";

          if (response.ok && contentType.includes("application/pdf")) {
            const totalBytesHeader = response.headers.get("content-length");
            const totalBytes = totalBytesHeader && /^\d+$/.test(totalBytesHeader) ? Number(totalBytesHeader) : null;
            publishProgress({ progress: totalBytes === null ? undefined : 0, receivedBytes: 0, totalBytes });
            const samples: TransferSample[] = [];
            const blob = await readResponseBlob(response, (receivedBytes, _totalBytes, atMs) => {
              samples.push({ receivedBytes, atMs });
              const metrics = getTransferMetrics(samples.slice(-8), totalBytes);
              publishProgress({
                progress: getDownloadProgress(receivedBytes, totalBytes),
                receivedBytes,
                totalBytes,
                speedBytesPerSecond: metrics.speedBytesPerSecond,
                remainingSeconds: metrics.remainingSeconds,
                phase: "downloading",
              });
            });
            if (isNativeCapacitor() && options.nativeDelivery === "share") {
              await shareBlobAsNativeFile(blob, options.fileName || "report.pdf");
            } else {
              await downloadBlobAsFile(blob, options.fileName || "report.pdf");
            }
            publishProgress({ progress: 100, receivedBytes: totalBytes ?? blob.size, totalBytes: totalBytes ?? blob.size, speedBytesPerSecond: null, remainingSeconds: 0, phase: "downloading" });
            setStatus("success");
            if (options.analytics) {
              trackAnalyticsEvent(options.analytics.eventName, options.analytics.params);
            }

            if (options.successTitle || options.successMessage) {
              setModal({
                status: "success",
                title: options.successTitle || "تم تنزيل الملف",
                message:
                  options.successMessage ||
                  "تم تنزيل الملف بنجاح.",
              });
            } else {
              setModal(null);
            }

            return "downloaded";
          }

          let payload: unknown = null;

          try {
            payload = await response.json();
          } catch {
            payload = null;
          }

          const fallbackUrl = getPrintExportFallbackUrl(
            payload,
            options.printUrl,
          );

          if (fallbackUrl) {
            setModal((current) =>
              current?.status === "loading"
                ? {
                    ...current,
                    title:
                      options.fallbackProgressTitle || current.title,
                    message:
                      options.fallbackProgressMessage || current.message,
                  }
                : current,
            );
            return openFallbackPrintUrl({
              printUrl: fallbackUrl,
              fileName: options.fileName,
              title: fallbackMeta.title,
              message: fallbackMeta.message,
            }, options.analytics);
          }

          if (!response.ok) {
            throw new Error("PRINT_EXPORT_REQUEST_FAILED");
          }
        }

        if (options.printUrl) {
          setModal((current) =>
            current?.status === "loading"
              ? {
                  ...current,
                  title: options.fallbackProgressTitle || current.title,
                  message: options.fallbackProgressMessage || current.message,
                }
              : current,
          );
          return openFallbackPrintUrl({
            printUrl: options.printUrl,
            fileName: options.fileName,
            title: fallbackMeta.title,
            message: fallbackMeta.message,
          }, options.analytics);
        }

        throw new Error("PRINT_EXPORT_NO_FALLBACK");
      } catch {
        if (runController.signal.aborted) return null;
        stopProgress();
        setStatus("error");
        setModal({
          status: "error",
          title: options.errorTitle || "تعذر التصدير",
          message:
            options.errorMessage ||
            "تعذر تنفيذ عملية التصدير أو فتح معاينة الطباعة. حاول مرة أخرى.",
        });
        return "error";
      } finally {
        if (directDownloadAbortRef.current === runController) directDownloadAbortRef.current = null;
      }
    },
    [finishProgress, openFallbackPrintUrl, startProgress, stopProgress],
  );

  return {
    status,
    modal,
    runPrintExport,
    openFallbackPrintUrl,
    closeModal,
  };
}
