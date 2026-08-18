"use client";

import { useState, type ReactNode } from "react";
import { Download } from "lucide-react";

import { BrandLoader } from "@/components/common/brand-loader";
import { downloadResponseAsFile } from "@/lib/print-export/print-export-download";

type GuardianSummonsReportEnginePdfButtonProps = {
  payload: Record<string, unknown>;
  fileName: string;
  disabled?: boolean;
  children?: ReactNode;
  onBeforeDownload?: () => boolean | Promise<boolean>;
  onAfterDownload?: () => void | Promise<void>;
};

export function GuardianSummonsReportEnginePdfButton({
  payload,
  fileName,
  disabled = false,
  children,
  onBeforeDownload,
  onAfterDownload,
}: GuardianSummonsReportEnginePdfButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function downloadPdf() {
    if (disabled || isDownloading) return;

    setIsDownloading(true);

    try {
      const canContinue = onBeforeDownload ? await onBeforeDownload() : true;

      if (!canContinue) return;

      const response = await fetch(
        "/api/dashboard/family-school-communication/guardian-summons/export/pdf",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            payload,
            fileName,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "تعذر إنشاء ملف PDF.");
      }

      await downloadResponseAsFile(response, sanitizePdfFileName(fileName));

      await onAfterDownload?.();
    } catch (error) {
      alert(error instanceof Error ? error.message : "تعذر تحميل ملف PDF.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={downloadPdf}
      disabled={disabled || isDownloading}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isDownloading ? (
        <BrandLoader variant="button" size="xs" label={null} />
      ) : (
        <Download className="h-4 w-4" />
      )}

      <span>{isDownloading ? "جاري تجهيز PDF..." : children || "تحميل PDF"}</span>
    </button>
  );
}

function sanitizePdfFileName(fileName: string) {
  const cleaned = fileName
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

  return cleaned.endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
}
