"use client";

import { useState } from "react";

type AppreciationCertificatePdfButtonProps = {
  payload: Record<string, unknown>;
  fileName?: string;
  children?: React.ReactNode;
  onAfterDownload?: () => void;
};

export function AppreciationCertificatePdfButton({
  payload,
  fileName = "appreciation-certificate.pdf",
  children = "تحميل شهادة PDF",
  onAfterDownload,
}: AppreciationCertificatePdfButtonProps) {
  const [loading, setLoading] = useState(false);

  async function downloadPdf() {
    if (loading) return;

    setLoading(true);

    try {
      const response = await fetch(
        "/api/dashboard/student-follow-up/appreciation-certificates/export/pdf",
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
        throw new Error(data?.error || "تعذر تصدير شهادة الشكر.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      onAfterDownload?.();
    } catch (error) {
      alert(error instanceof Error ? error.message : "حدث خطأ أثناء التصدير.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={downloadPdf}
      disabled={loading}
      className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "جاري التصدير..." : children}
    </button>
  );
}
