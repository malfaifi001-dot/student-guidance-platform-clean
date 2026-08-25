"use client";

import { Download, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { PrintExportPopCard } from "@/components/print-export/print-export-pop-card";
import { usePrintExportAction } from "@/components/print-export/use-print-export-action";
import { getPortfolioTheme } from "@/lib/portfolio/portfolio-theme-registry";
import type { PortfolioSnapshotListItem } from "@/lib/portfolio/portfolio-snapshot-types";

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
  const print = usePrintExportAction();

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
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {snapshots.map((snapshot) => {
            const summary = snapshot.summary;
            const theme = getPortfolioTheme(summary?.themeId || "");
            return (
              <article
                key={snapshot.id}
                className="group relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-sky-50/30 p-5 shadow-sm shadow-slate-200/70 transition duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:bg-white hover:shadow-md hover:shadow-sky-100/70 focus-within:-translate-y-0.5 focus-within:border-sky-300 focus-within:bg-white focus-within:shadow-md"
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
                <div className="relative mt-5 flex flex-wrap gap-2">
                  <Link
                    href={`${snapshotBasePath}/${snapshot.id}`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
                  >
                    <ExternalLink className="h-4 w-4" /> عرض النسخة
                  </Link>
                  <button
                    type="button"
                    disabled={print.status === "loading"}
                    onClick={() => void print.runPrintExport({ exportUrl: `/api/dashboard/portfolio/snapshots/${encodeURIComponent(snapshot.id)}/export/pdf`, fileName: `${snapshot.name}.pdf`, progressTitle: "جاري تجهيز الملف", progressMessage: "يتم الآن تجهيز ملف الإنجاز للتحميل، الرجاء الانتظار...", blockedTitle: "معاينة ملف الإنجاز" })}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-100 disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" /> تحميل
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
      <PrintExportPopCard modal={print.modal} onClose={print.closeModal} onOpenFallback={(fallback) => void print.openFallbackPrintUrl(fallback)} />
    </section>
  );
}
