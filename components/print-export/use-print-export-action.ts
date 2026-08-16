"use client";

import { useCallback, useState } from "react";
import {
  buildPrintUrl,
  downloadBlobAsFile,
} from "@/lib/print-export/print-export-download";
import type {
  PrintExportActionOptions,
  PrintExportFallback,
  PrintExportModal,
  PrintExportRunResult,
  PrintExportStatus,
} from "@/lib/print-export/print-export-types";
import { trackAnalyticsEvent } from "@/lib/analytics/analytics-client";

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

export function usePrintExportAction() {
  const [status, setStatus] = useState<PrintExportStatus>("idle");
  const [modal, setModal] = useState<PrintExportModal | null>(null);

  const closeModal = useCallback(() => {
    setModal(null);
    setStatus("idle");
  }, []);

  const openFallbackPrintUrl = useCallback(
    (
      fallback?: PrintExportFallback | null,
      analytics?: PrintExportActionOptions["analytics"],
    ): PrintExportRunResult => {
      const targetUrl = buildPrintUrl(fallback?.printUrl || "");

      if (!targetUrl) {
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

      const popup = window.open(targetUrl, "_blank", "noopener,noreferrer");

      if (!popup) {
        setStatus("blocked");
        setModal({
          status: "blocked",
          title: fallback?.title || "معاينة الطباعة",
          message:
            fallback?.message ||
            "تم حظر فتح نافذة المعاينة تلقائياً. استخدم الزر أدناه لفتح معاينة الطباعة.",
          fallback: {
            printUrl: targetUrl,
            title: fallback?.title,
            message: fallback?.message,
          },
        });
        return "blocked";
      }

      setStatus("success");
      if (analytics) {
        trackAnalyticsEvent(analytics.eventName, analytics.params);
      }
      return "opened";
    },
    [],
  );

  const runPrintExport = useCallback(
    async (options: PrintExportActionOptions): Promise<PrintExportRunResult> => {
      setStatus("loading");
      setModal(null);

      const fallbackMeta = {
        title: options.blockedTitle || "معاينة الطباعة",
        message:
          options.blockedMessage ||
          "تم حظر فتح نافذة المعاينة تلقائياً. استخدم الزر أدناه لفتح معاينة الطباعة.",
      };

      try {
        if (options.exportUrl) {
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
            const blob = await response.blob();
            await downloadBlobAsFile(blob, options.fileName || "report.pdf");
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
            return openFallbackPrintUrl({
              printUrl: fallbackUrl,
              title: fallbackMeta.title,
              message: fallbackMeta.message,
            }, options.analytics);
          }

          if (!response.ok) {
            throw new Error("PRINT_EXPORT_REQUEST_FAILED");
          }
        }

        if (options.printUrl) {
          return openFallbackPrintUrl({
            printUrl: options.printUrl,
            title: fallbackMeta.title,
            message: fallbackMeta.message,
          }, options.analytics);
        }

        throw new Error("PRINT_EXPORT_NO_FALLBACK");
      } catch {
        setStatus("error");
        setModal({
          status: "error",
          title: options.errorTitle || "تعذر التصدير",
          message:
            options.errorMessage ||
            "تعذر تنفيذ عملية التصدير أو فتح معاينة الطباعة. حاول مرة أخرى.",
        });
        return "error";
      }
    },
    [openFallbackPrintUrl],
  );

  return {
    status,
    modal,
    runPrintExport,
    openFallbackPrintUrl,
    closeModal,
  };
}
