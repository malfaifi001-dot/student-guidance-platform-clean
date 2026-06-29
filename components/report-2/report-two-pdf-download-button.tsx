"use client";

import { type ReactNode, useCallback, useState } from "react";

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
  children?: ReactNode;
};

function formatFileName(value: string) {
  return (
    value
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 150) || "report"
  );
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
  children,
}: PdfDownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [fallbackState, setFallbackState] = useState<{
    message: string;
    previewUrl?: string;
  } | null>(null);

  const openPreviewWindow = useCallback((previewUrl: string) => {
    const popup = window.open(previewUrl, "_blank", "noopener,noreferrer");

    if (popup) {
      setFallbackState(null);
    } else {
      setFallbackState({
        message:
          "تم حظر فتح معاينة الطباعة تلقائياً. استخدم الزر أدناه لفتح المعاينة في نافذة جديدة.",
        previewUrl,
      });
    }

    return popup;
  }, []);

  const handleDownload = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    setFallbackState(null);

    try {
      const pages = getPages(
        snapshot.snapshotTemplateJson,
        snapshot.snapshotPagesJson,
      );

      if (!pages) {
        setFallbackState({
          message: "تعذر إنشاء معاينة الطباعة لهذا التقرير. حاول مرة أخرى.",
        });
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
        setFallbackState({
          message: "تعذر فتح معاينة الطباعة تلقائياً. حاول مرة أخرى.",
        });
        return;
      }

      if (
        data.fallback === "PRINT_PREVIEW" &&
        typeof data.previewUrl === "string"
      ) {
        openPreviewWindow(data.previewUrl);
        return;
      }

      setFallbackState({
        message: "تعذر فتح معاينة الطباعة لهذا التقرير. حاول مرة أخرى.",
      });
    } catch {
      setFallbackState({
        message: "تعذر تنزيل PDF أو فتح معاينة الطباعة. حاول مرة أخرى.",
      });
    } finally {
      setLoading(false);
    }
  }, [loading, openPreviewWindow, snapshot]);

  return (
    <>
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className={className}
      >
        {children ? (loading ? "..." : children) : loading ? "... جارٍ التحميل" : label || "تحميل PDF"}
      </button>

      {fallbackState ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          dir="rtl"
        >
          <section className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <header className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-xl font-black text-slate-950">
                معاينة الطباعة
              </h2>
              <p className="mt-2 text-sm font-bold text-slate-500">
                {fallbackState.message}
              </p>
              {fallbackState.previewUrl ? (
                <button
                  type="button"
                  onClick={() => openPreviewWindow(fallbackState.previewUrl!)}
                  className="mt-4 inline-flex rounded-2xl bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700 transition hover:bg-emerald-100"
                >
                  فتح معاينة الطباعة
                </button>
              ) : null}
            </header>

            <footer className="flex justify-end px-6 py-4">
              <button
                type="button"
                onClick={() => setFallbackState(null)}
                className="rounded-2xl bg-emerald-700 px-5 py-2 text-xs font-black text-white transition hover:bg-emerald-800"
              >
                حسنًا
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
