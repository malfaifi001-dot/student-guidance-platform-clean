"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { getCertificateTypeLabel } from "@/lib/certificates/certificate-types";
import { PrintExportPopCard } from "@/components/print-export/print-export-pop-card";
import { usePrintExportAction } from "@/components/print-export/use-print-export-action";

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
  const printExport = usePrintExportAction();

  async function downloadBatch() {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const fileName = sanitizeFileName(
        `دفعة شهادات - ${batchNumber || batchId} - ${formatFileDate(createdAt)}.pdf`,
      );

      await printExport.runPrintExport({
        exportUrl: `/api/dashboard/certificates/batches/${encodeURIComponent(batchId)}/export/pdf`,
        printUrl: `/certificate-batch-preview/${encodeURIComponent(batchId)}`,
        method: "POST",
        body: { fileName },
        fileName,
        nativeDelivery: "share",
        blockedTitle: "معاينة طباعة الدفعة",
        errorTitle: "تحميل الدفعة",
        errorMessage: "تعذر تحميل الدفعة أو فتح معاينة الطباعة.",
      });
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

      <PrintExportPopCard
        modal={printExport.modal}
        onClose={printExport.closeModal}
        onOpenFallback={printExport.openFallbackPrintUrl}
      />
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
  const printExport = usePrintExportAction();

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

      await printExport.runPrintExport({
        exportUrl: `/api/dashboard/certificates/${encodeURIComponent(certificateId)}/export/pdf`,
        printUrl: `/certificate-preview/${encodeURIComponent(certificateId)}`,
        method: "POST",
        body: { fileName },
        fileName,
        nativeDelivery: "share",
        blockedTitle: "معاينة طباعة الشهادة",
        errorTitle: "تحميل الشهادة",
        errorMessage: "تعذر تحميل الشهادة أو فتح معاينة الطباعة.",
      });
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

      <PrintExportPopCard
        modal={printExport.modal}
        onClose={printExport.closeModal}
        onOpenFallback={printExport.openFallbackPrintUrl}
      />
    </div>
  );
}
