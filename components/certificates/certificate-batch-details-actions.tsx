"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { getCertificateTypeLabel } from "@/lib/certificates/certificate-types";
import { downloadResponseAsFile } from "@/lib/print-export/print-export-download";
import { isNativeCapacitor } from "@/lib/native/native-runtime";
import { savePrintPreviewAsNativePdf } from "@/lib/native/native-download";

function sanitizeFileName(value: string) {
  return value
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function formatFileDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

async function downloadPdfFromResponse(response: Response, fileName: string) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const json = await response.json();

    if (json.fallback === "PRINT_PREVIEW" && json.previewUrl) {
      if (isNativeCapacitor()) {
        const opened = await savePrintPreviewAsNativePdf(json.previewUrl, fileName);
        if (!opened) throw new Error("PRINT_PREVIEW_OPEN_FAILED");
        return;
      }

      const previewWindow = window.open(
        json.previewUrl,
        "_blank",
        "noopener,noreferrer",
      );

      if (!previewWindow) {
        window.location.href = json.previewUrl;
      }

      return;
    }
  }

  await downloadResponseAsFile(response, fileName);
}

export function BatchPdfDownloadButton({
  batchId,
  batchNumber,
  createdAt,
}: {
  batchId: string;
  batchNumber: string;
  createdAt: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function downloadBatch() {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const fileName = sanitizeFileName(
        `دفعة شهادات - ${batchNumber || batchId} - ${formatFileDate(createdAt)}.pdf`,
      );

      const response = await fetch(
        `/api/dashboard/certificates/batches/${encodeURIComponent(batchId)}/export/pdf`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fileName }),
        },
      );

      if (!response.ok) {
        throw new Error("تعذر تحميل الدفعة.");
      }

      await downloadPdfFromResponse(response, fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل الدفعة.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={downloadBatch}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800 disabled:opacity-60"
      >
        <Download className="h-4 w-4" />
        {loading ? "جاري تحميل الدفعة..." : "تحميل الدفعة PDF"}
      </button>

      {error ? (
        <p className="text-xs font-black text-rose-600">{error}</p>
      ) : null}
    </div>
  );
}

export function CertificatePdfDownloadButton({
  certificateId,
  certificateType,
  recipientName,
  issueDate,
}: {
  certificateId: string;
  certificateType: string;
  recipientName: string;
  issueDate: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function downloadCertificate() {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const fileName = sanitizeFileName(
        `${getCertificateTypeLabel(certificateType)} - ${
          recipientName || "مستفيد"
        } - ${formatFileDate(issueDate)}.pdf`,
      );

      const response = await fetch(
        `/api/dashboard/certificates/${encodeURIComponent(certificateId)}/export/pdf`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fileName }),
        },
      );

      if (!response.ok) {
        throw new Error("تعذر تحميل الشهادة.");
      }

      await downloadPdfFromResponse(response, fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل الشهادة.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={downloadCertificate}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-800 disabled:opacity-60"
      >
        <Download className="h-4 w-4" />
        {loading ? "جاري التحميل" : "تحميل فردي"}
      </button>

      {error ? (
        <p className="text-xs font-black text-rose-600">{error}</p>
      ) : null}
    </div>
  );
}
