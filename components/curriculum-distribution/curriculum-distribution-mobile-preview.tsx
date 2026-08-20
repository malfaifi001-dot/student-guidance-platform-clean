"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2, X } from "lucide-react";

const A4_LANDSCAPE_WIDTH = 1122;
const A4_LANDSCAPE_HEIGHT = 794;

export function CurriculumDistributionMobilePreview({
  open,
  previewUrl,
  onDownload,
  onClose,
}: {
  open: boolean;
  previewUrl: string;
  onDownload: () => Promise<boolean>;
  onClose: () => void;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    const updateScale = () => {
      const frame = frameRef.current;
      if (!frame) return;

      const availableWidth = Math.max(280, frame.clientWidth - 16);
      setScale(Math.min(1, Number((availableWidth / A4_LANDSCAPE_WIDTH).toFixed(4))));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (frameRef.current) observer.observe(frameRef.current);
    window.addEventListener("resize", updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, [open]);

  if (!open) return null;

  async function download() {
    if (downloading) return;

    setDownloading(true);
    setError("");

    try {
      const downloaded = await onDownload();
      if (!downloaded) setError("تعذر تحميل الملف. حاول مرة أخرى.");
    } catch {
      setError("تعذر تحميل الملف. حاول مرة أخرى.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-4"
      dir="rtl"
      onClick={onClose}
    >
      <section
        className="flex max-h-[94vh] w-full max-w-[430px] flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-2xl shadow-sky-950/30"
        onClick={(event) => event.stopPropagation()}
        aria-label="معاينة توزيع المنهج"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <div>
            <h2 className="text-base font-black text-slate-950">معاينة توزيع المنهج</h2>
            <p className="mt-0.5 text-[11px] font-bold text-slate-500">
              راجع التقرير قبل تحميله على جهازك.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            aria-label="إغلاق المعاينة"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div ref={frameRef} className="min-h-0 flex-1 overflow-y-auto bg-slate-100 p-2.5 sm:p-3">
          <div
            className="relative mx-auto overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200"
            style={{ height: `${A4_LANDSCAPE_HEIGHT * scale}px` }}
          >
            <iframe
              title="معاينة تقرير توزيع المنهج"
              src={previewUrl}
              className="absolute left-1/2 top-0 block border-0 bg-white"
              style={{
                width: `${A4_LANDSCAPE_WIDTH}px`,
                height: `${A4_LANDSCAPE_HEIGHT}px`,
                transform: `translateX(-50%) scale(${scale})`,
                transformOrigin: "top center",
              }}
            />
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-100 bg-white p-3 sm:p-4">
          {error ? (
            <p className="mb-2 rounded-xl bg-rose-50 px-3 py-2 text-center text-xs font-bold text-rose-700">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void download()}
              disabled={downloading}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-sky-600 text-sm font-black text-white shadow-lg shadow-sky-200 transition hover:bg-sky-700 disabled:cursor-wait disabled:opacity-60"
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {downloading ? "جارٍ تجهيز التحميل..." : "تحميل PDF"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-2xl bg-slate-100 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-200"
            >
              إغلاق
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
