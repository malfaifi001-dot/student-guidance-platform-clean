"use client";

import { Download, ExternalLink, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { getPortfolioTheme } from "@/lib/portfolio/portfolio-theme-registry";
import type { PortfolioSnapshotListItem } from "@/lib/portfolio/portfolio-snapshot-types";
import { PortfolioFeedbackPopCard, type PortfolioFeedback } from "@/components/portfolio/portfolio-feedback-pop-card";
import { downloadBlobAsFile, getFileNameFromContentDisposition } from "@/lib/print-export/print-export-download";

type SnapshotDownloadState = {
  phase: "preparing" | "downloading";
  receivedBytes: number;
  totalBytes: number | null;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseContentLength(value: string | null) {
  if (!value) return null;
  const length = Number(value);
  return Number.isSafeInteger(length) && length > 0 ? length : null;
}

async function responseError(response: Response) {
  const payload = await response.json().catch(() => ({}));
  return typeof payload.error === "string" ? payload.error : "تعذر تحميل ملف PDF.";
}

export function PortfolioSavedCopies({
  portfolioId,
  snapshotBasePath,
  refreshKey,
}: {
  portfolioId: string;
  snapshotBasePath: string;
  refreshKey: number;
}) {
  const [snapshots, setSnapshots] = useState<PortfolioSnapshotListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<PortfolioFeedback | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadStates, setDownloadStates] = useState<Record<string, SnapshotDownloadState>>({});
  const [downloadedSizes, setDownloadedSizes] = useState<Record<string, number>>({});
  const [downloadErrors, setDownloadErrors] = useState<Record<string, string>>({});
  const activeDownloadsRef = useRef(new Set<string>());

  async function downloadSnapshot(snapshot: PortfolioSnapshotListItem) {
    if (activeDownloadsRef.current.has(snapshot.id)) return;
    activeDownloadsRef.current.add(snapshot.id);
    setDownloadErrors((current) => ({ ...current, [snapshot.id]: "" }));
    setDownloadStates((current) => ({
      ...current,
      [snapshot.id]: { phase: "preparing", receivedBytes: 0, totalBytes: null },
    }));

    try {
      const response = await fetch(`/api/dashboard/portfolio/snapshots/${encodeURIComponent(snapshot.id)}/export/pdf`, {
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error(await responseError(response));

      const totalBytes = parseContentLength(response.headers.get("content-length"));
      const fileName = getFileNameFromContentDisposition(response.headers.get("content-disposition"), `${snapshot.name}.pdf`);
      const contentType = response.headers.get("content-type") || "application/pdf";
      let receivedBytes = 0;
      let fileBlob: Blob;

      if (totalBytes !== null) {
        setDownloadedSizes((current) => ({ ...current, [snapshot.id]: totalBytes }));
      }

      setDownloadStates((current) => ({
        ...current,
        [snapshot.id]: { phase: "downloading", receivedBytes: 0, totalBytes },
      }));

      if (response.body) {
        const reader = response.body.getReader();
        const chunks: BlobPart[] = [];
        while (true) {
          const result = await reader.read();
          if (result.done) break;
          if (!result.value?.byteLength) continue;
          chunks.push(result.value as unknown as BlobPart);
          receivedBytes += result.value.byteLength;
          setDownloadStates((current) => ({
            ...current,
            [snapshot.id]: { phase: "downloading", receivedBytes, totalBytes },
          }));
        }
        fileBlob = new Blob(chunks, { type: contentType });
      } else {
        fileBlob = await response.blob();
        receivedBytes = fileBlob.size;
        setDownloadStates((current) => ({
          ...current,
          [snapshot.id]: { phase: "downloading", receivedBytes, totalBytes: totalBytes || receivedBytes },
        }));
      }

      if (!receivedBytes) throw new Error("تعذر استلام ملف PDF.");
      if (totalBytes !== null && receivedBytes !== totalBytes) {
        throw new Error("اكتمل تحميل ملف PDF بشكل غير صحيح. حاول مرة أخرى.");
      }
      await downloadBlobAsFile(fileBlob, fileName);
      setDownloadedSizes((current) => ({ ...current, [snapshot.id]: receivedBytes }));
      setDownloadStates((current) => {
        const next = { ...current };
        delete next[snapshot.id];
        return next;
      });
    } catch (reason) {
      setDownloadErrors((current) => ({
        ...current,
        [snapshot.id]: reason instanceof Error ? reason.message : "تعذر تحميل ملف PDF.",
      }));
      setDownloadStates((current) => {
        const next = { ...current };
        delete next[snapshot.id];
        return next;
      });
    } finally {
      activeDownloadsRef.current.delete(snapshot.id);
    }
  }

  function confirmDelete(snapshot: PortfolioSnapshotListItem) {
    setFeedback({
      type: "confirm",
      title: "حذف النسخة",
      description: "هل تريد حذف هذه النسخة من ملف الإنجاز؟ لا يمكن التراجع عن هذا الإجراء.",
      confirmLabel: "حذف النسخة",
      onConfirm: () => void deleteSnapshot(snapshot),
    });
  }

  async function deleteSnapshot(snapshot: PortfolioSnapshotListItem) {
    setDeletingId(snapshot.id);
    try {
      const response = await fetch(`/api/dashboard/portfolio/${encodeURIComponent(portfolioId)}/snapshots/${encodeURIComponent(snapshot.id)}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "تعذر حذف النسخة.");
      setSnapshots((items) => items.filter((item) => item.id !== snapshot.id));
      setFeedback({ type: "success", title: "تم حذف النسخة بنجاح" });
    } catch (reason) {
      setFeedback({ type: "error", title: "تعذر حذف النسخة", description: reason instanceof Error ? reason.message : "حاول مرة أخرى." });
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/dashboard/portfolio/${encodeURIComponent(portfolioId)}/snapshots`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "تعذر تحميل النسخ المحفوظة.");
        return payload.snapshots as PortfolioSnapshotListItem[];
      })
      .then((items) => {
        if (!cancelled) setSnapshots(items);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "تعذر تحميل النسخ المحفوظة.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [portfolioId, refreshKey]);

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div>
        <h2 className="text-xl font-black text-slate-950">النسخ المحفوظة</h2>
      </div>

      {loading ? (
        <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-slate-50 p-8 text-sm font-black text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" /> جارٍ تحميل النسخ
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700">{error}</div>
      ) : snapshots.length ? (
        <div className="mt-6 flex snap-x snap-proximity gap-4 overflow-x-auto pb-2 touch-pan-x md:grid md:grid-cols-2 md:overflow-visible md:pb-0">
          {snapshots.map((snapshot) => {
            const summary = snapshot.summary;
            const theme = getPortfolioTheme(summary?.themeId || "");
            const downloadState = downloadStates[snapshot.id];
            const downloadTotal = downloadState?.totalBytes;
            const downloadPercent = downloadState && downloadTotal
              ? Math.min(100, Math.floor((downloadState.receivedBytes / downloadTotal) * 100))
              : null;
            return (
              <article
                key={snapshot.id}
                className="group relative min-w-[290px] snap-start overflow-hidden rounded-[1.75rem] border border-slate-200 bg-sky-50/30 p-5 shadow-sm shadow-slate-200/70 transition duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:bg-white hover:shadow-md hover:shadow-sky-100/70 focus-within:-translate-y-0.5 focus-within:border-sky-300 focus-within:bg-white focus-within:shadow-md md:min-w-0"
              >
                <span aria-hidden="true" className="absolute inset-y-0 right-0 w-1 bg-sky-500/60 transition-colors group-hover:bg-sky-600 group-focus-within:bg-sky-600" />
                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-slate-950">{snapshot.name}</h3>
                    <p className="mt-1 text-xs font-bold text-slate-500">{new Date(snapshot.createdAt).toLocaleString("ar-SA")}</p>
                  </div>
                  <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">معتمدة</span>
                </div>
                <div className="relative mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-slate-100 bg-white/80 p-3 text-xs font-bold text-slate-600">
                  <span><span className="text-slate-400">العام:</span> {summary?.academicYear || "—"}</span>
                  <span><span className="text-slate-400">الفصل:</span> {summary?.term || "—"}</span>
                  <span><span className="text-slate-400">التصميم:</span> {theme.name}</span>
                  <span><span className="text-slate-400">الدور:</span> {snapshot.roleAtCreation}</span>
                </div>
                {snapshot.notes ? <p className="relative mt-4 text-sm font-bold leading-6 text-slate-600">{snapshot.notes}</p> : null}
                <p className="relative mt-4 text-xs font-black text-slate-500">
                  {downloadedSizes[snapshot.id]
                    ? `حجم PDF: ${formatFileSize(downloadedSizes[snapshot.id])}`
                    : "سيظهر حجم الملف بعد إنشائه"}
                </p>
                {downloadState ? (
                  <div className="relative mt-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-3" aria-live="polite">
                    {downloadState.phase === "preparing" ? (
                      <p className="text-xs font-black text-sky-800">Preparing PDF...</p>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-3 text-xs font-black text-sky-800">
                          <span>{downloadPercent === null ? "Downloading" : `Downloading: ${downloadPercent}%`}</span>
                          <span>
                            {formatFileSize(downloadState.receivedBytes)}
                            {downloadTotal ? ` / ${formatFileSize(downloadTotal)}` : ""}
                          </span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-sky-100" role="progressbar" aria-label="PDF download progress" aria-valuemin={0} aria-valuemax={downloadTotal || undefined} aria-valuenow={downloadTotal ? downloadState.receivedBytes : undefined}>
                          <div className={`h-full rounded-full bg-sky-600 transition-[width] duration-150 ${downloadPercent === null ? "w-1/3 animate-pulse" : ""}`} style={downloadPercent === null ? undefined : { width: `${downloadPercent}%` }} />
                        </div>
                      </>
                    )}
                  </div>
                ) : null}
                {downloadErrors[snapshot.id] ? <p className="relative mt-2 text-xs font-bold text-rose-700" role="alert">{downloadErrors[snapshot.id]}</p> : null}
                <div className="relative mt-5 flex flex-wrap gap-2">
                  <Link
                    href={`${snapshotBasePath}/${snapshot.id}`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
                  >
                    <ExternalLink className="h-4 w-4" /> عرض النسخة
                  </Link>
                  <button
                    type="button"
                    disabled={Boolean(downloadState)}
                    onClick={() => void downloadSnapshot(snapshot)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-100"
                  >
                    <Download className="h-4 w-4" /> {downloadState ? "Downloading..." : "تحميل"}
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === snapshot.id || deletingId !== null}
                    onClick={() => confirmDelete(snapshot)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-black text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" /> حذف النسخة
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-black text-slate-500">
          لا توجد نسخ محفوظة بعد. اعتمد نسختك الأولى بعد مراجعة المعاينة.
        </div>
      )}
      <PortfolioFeedbackPopCard feedback={feedback} loading={deletingId !== null} onClose={() => deletingId === null && setFeedback(null)} />
    </section>
  );
}
