"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { PortfolioPrintDocument } from "@/components/portfolio/print/portfolio-print-document";
import { PortfolioPreviewFit } from "@/components/portfolio/portfolio-preview-fit";
import type { PortfolioPrintData } from "@/components/portfolio/print/portfolio-print-types";

type PreviewSnapshot = {
  progress: number;
  expectedPages: number;
  renderedPages: number;
  loadedImages: number;
  imageCount: number;
  failedImages: number;
  fontsReady: boolean;
  ready: boolean;
};

const INITIAL: PreviewSnapshot = {
  progress: 0,
  expectedPages: 0,
  renderedPages: 0,
  loadedImages: 0,
  imageCount: 0,
  failedImages: 0,
  fontsReady: false,
  ready: false,
};

function scanPreview(root: HTMLElement, fontsReady: boolean): PreviewSnapshot {
  const documentRoot = root.querySelector<HTMLElement>("[data-portfolio-physical-page-count]");
  const expectedPages = Number(documentRoot?.dataset.portfolioPhysicalPageCount || "0");
  const renderedPages = documentRoot?.querySelectorAll("[data-portfolio-page-type], .portfolio-page, .atlas-page, .hzn-page, .moe24-page").length || 0;
  const images = documentRoot ? Array.from(documentRoot.querySelectorAll<HTMLImageElement>("img")) : [];
  const loadedImages = images.filter((image) => image.complete && image.naturalWidth > 0).length;
  const failedImages = images.filter((image) => image.complete && image.naturalWidth === 0).length;
  const imageCount = images.length;
  const pagesReady = expectedPages > 0 && renderedPages === expectedPages;
  const markerReady = documentRoot?.dataset.portfolioPdfReady === "true";

  let progress = documentRoot ? 42 : 12;
  if (expectedPages > 0) progress = 45 + Math.min(25, Math.round((renderedPages / expectedPages) * 25));
  if (imageCount > 0) progress = Math.max(progress, 70 + Math.round((loadedImages / imageCount) * 20));
  else if (pagesReady) progress = Math.max(progress, 90);
  if (fontsReady) progress = Math.max(progress, 96);
  const ready = Boolean(markerReady && pagesReady && fontsReady && failedImages === 0);
  if (ready) progress = 100;

  return { progress: Math.min(99, progress), expectedPages, renderedPages, loadedImages, imageCount, failedImages, fontsReady, ready };
}

export function PortfolioSharedPreview({ data }: { data: PortfolioPrintData }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [snapshot, setSnapshot] = useState<PreviewSnapshot>(INITIAL);
  const [showLoading, setShowLoading] = useState(true);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let disposed = false;
    let fontsReady = false;
    let readyTimer: number | null = null;

    const scan = () => {
      if (disposed) return;
      const next = scanPreview(root, fontsReady);
      setSnapshot((current) => {
        const progress = next.ready ? 100 : Math.max(current.progress, next.progress);
        return { ...next, progress };
      });
      if (next.ready && readyTimer === null) {
        readyTimer = window.setTimeout(() => { if (!disposed) setShowLoading(false); }, 700);
      }
    };

    const observer = new MutationObserver(scan);
    observer.observe(root, { childList: true, subtree: true, attributes: true });
    const onResourceChange = () => scan();
    root.addEventListener("load", onResourceChange, true);
    root.addEventListener("error", onResourceChange, true);
    const fonts = document.fonts;
    if (fonts) {
      void fonts.ready.then(() => { fontsReady = true; scan(); });
    } else {
      fontsReady = true;
    }
    scan();

    return () => {
      disposed = true;
      observer.disconnect();
      root.removeEventListener("load", onResourceChange, true);
      root.removeEventListener("error", onResourceChange, true);
      if (readyTimer !== null) window.clearTimeout(readyTimer);
    };
  }, []);

  const failed = snapshot.failedImages > 0;

  return (
    <div ref={rootRef} className="relative min-w-0 max-w-full overflow-x-hidden">
      <div className="portfolio-share-page mx-auto w-full min-w-0 max-w-[900px] overflow-hidden">
        <PortfolioPreviewFit>
          <PortfolioPrintDocument data={data} />
        </PortfolioPreviewFit>
      </div>
      {showLoading ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm" dir="rtl">
          <section role="status" aria-live="polite" className="w-full max-w-md rounded-[1.75rem] bg-white p-5 text-center shadow-2xl sm:p-7">
            {failed ? <AlertTriangle className="mx-auto h-9 w-9 text-rose-600" /> : <Loader2 className="mx-auto h-9 w-9 animate-spin text-sky-600" />}
            <h2 className="mt-3 text-lg font-black text-slate-950">{failed ? "تعذر تجهيز ملف الإنجاز" : "جار تجهيز ملف الإنجاز"}</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-500">{failed ? "تعذر تحميل بعض صور الشواهد. أعد المحاولة للتحقق من اكتمال العرض." : "جار تجهيز الصفحات والصور والخطوط للعرض."}</p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><div className="h-full rounded-full bg-sky-600 transition-[width] duration-200" style={{ width: `${snapshot.progress}%` }} /></div>
            <p className="mt-2 text-2xl font-black tabular-nums text-slate-900">{snapshot.progress}%</p>
            <p className="mt-2 text-xs font-bold text-slate-500">
              {failed ? `${snapshot.failedImages} صورة لم تكتمل` : snapshot.ready ? "ملف الإنجاز جاهز" : snapshot.expectedPages > 0 ? `جار تجهيز الصفحات (${snapshot.renderedPages} من ${snapshot.expectedPages})` : "جار تحميل البيانات"}
            </p>
            {failed ? <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">إعادة المحاولة</button> : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
