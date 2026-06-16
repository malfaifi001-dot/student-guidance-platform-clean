"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

type SnapshotInfo = {
  caseEntryId: string;
  reportTitle: string;
  snapshotTemplateJson?: unknown;
  snapshotPagesJson?: unknown;
};

type PdfDownloadButtonProps = {
  snapshot: SnapshotInfo;
  className?: string;
  label?: string;
};

function formatFileName(value: string) {
  return value
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150) || "report";
}

function getPages(
  templateJson: unknown,
  pagesJson: unknown,
): unknown[] | null {
  if (templateJson && typeof templateJson === "object") {
    const obj = templateJson as Record<string, unknown>;
    if (Array.isArray(obj.pages) && obj.pages.length > 0) {
      return obj.pages as unknown[];
    }
  }
  if (Array.isArray(pagesJson) && pagesJson.length > 0) {
    return pagesJson as unknown[];
  }
  return null;
}

export function ReportTwoPdfDownloadButton({
  snapshot,
  className = "",
  label,
}: PdfDownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDownload = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    try {
      const pages = getPages(
        snapshot.snapshotTemplateJson,
        snapshot.snapshotPagesJson,
      );
      if (!pages) {
        router.push("?print=1");
        return;
      }

      const exportSnapshot: Record<string, unknown> = {
        template: { pages },
      };

      const response = await fetch(
        `/api/dashboard/report-2/cases/${encodeURIComponent(snapshot.caseEntryId)}/export/pdf`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: formatFileName(snapshot.reportTitle),
            snapshot: exportSnapshot,
          }),
        },
      );

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/pdf")) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${formatFileName(snapshot.reportTitle)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return;
      }

      let data: Record<string, unknown> = {};
      try {
        data = await response.json();
      } catch {
        router.push("?print=1");
        return;
      }

      if (
        data.fallback === "PRINT_PREVIEW" &&
        typeof data.previewUrl === "string"
      ) {
        window.open(data.previewUrl, "_blank");
      } else {
        router.push("?print=1");
      }
    } catch {
      router.push("?print=1");
    } finally {
      setLoading(false);
    }
  }, [loading, snapshot, router]);

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className={className}
    >
      {loading
        ? "... جارٍ التحميل"
        : label || "تحميل PDF"}
    </button>
  );
}
