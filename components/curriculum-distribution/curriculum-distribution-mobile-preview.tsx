"use client";

import { useEffect, useRef, useState } from "react";
import type { TouchEvent, TouchList, WheelEvent } from "react";
import { ChevronLeft, ChevronRight, Download, Expand, Loader2, X } from "lucide-react";

const A4_LANDSCAPE_WIDTH = 1122;
const A4_LANDSCAPE_HEIGHT = 794;
const A4_PORTRAIT_WIDTH = 794;
const A4_PORTRAIT_HEIGHT = 1122;
const MIN_ZOOM_PERCENT = 30;
const MAX_ZOOM_PERCENT = 200;

type PinchState = {
  startDistance: number;
  startZoom: number;
};

type DragState = {
  startX: number;
  startY: number;
  startPanX: number;
  startPanY: number;
};

function getTouchDistance(touches: TouchList) {
  const first = touches[0];
  const second = touches[1];
  return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
}

export function CurriculumDistributionMobilePreview({
  open,
  previewUrl,
  onDownload,
  onClose,
  title = "معاينة توزيع المنهج",
  subtitle = "راجع التقرير قبل تحميله على جهازك.",
  documentSelector = ".curriculum-print-paper",
  documentLabel = "توزيع المنهج",
  documentNotFoundMessage = "تعذر العثور على مستند المعاينة.",
  pageSelector,
  allowDocumentScroll = false,
  hideDocumentScrollbars = false,
  documentOrientation = "landscape",
}: {
  open: boolean;
  previewUrl: string;
  onDownload: () => Promise<boolean>;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  documentSelector?: string;
  documentLabel?: string;
  documentNotFoundMessage?: string;
  pageSelector?: string;
  allowDocumentScroll?: boolean;
  hideDocumentScrollbars?: boolean;
  documentOrientation?: "landscape" | "portrait";
}) {
  const documentWidth = documentOrientation === "portrait" ? A4_PORTRAIT_WIDTH : A4_LANDSCAPE_WIDTH;
  const documentHeight = documentOrientation === "portrait" ? A4_PORTRAIT_HEIGHT : A4_LANDSCAPE_HEIGHT;
  const frameRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const frameReadyRef = useRef(false);
  const pinchRef = useRef<PinchState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [fitScale, setFitScale] = useState(1);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [fitMode, setFitMode] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [previewReady, setPreviewReady] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [previewReloadVersion, setPreviewReloadVersion] = useState(0);
  const [printPageCount, setPrintPageCount] = useState(0);
  const [activePrintPage, setActivePrintPage] = useState(0);

  useEffect(() => {
    if (!open) return;

    const updateScale = () => {
      const frame = frameRef.current;
      if (!frame) return;

      const availableWidth = Math.max(280, frame.clientWidth - 16);
      const availableHeight = Math.max(220, frame.clientHeight - 16);
      const widthScale = availableWidth / documentWidth;
      const heightScale = availableHeight / documentHeight;
      setFitScale(Math.min(1, Number(Math.min(widthScale, heightScale).toFixed(4))));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (frameRef.current) observer.observe(frameRef.current);
    window.addEventListener("resize", updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, [documentHeight, documentWidth, open]);

  useEffect(() => {
    if (!open) return;
    setZoomPercent(100);
    setFitMode(true);
    setPan({ x: 0, y: 0 });
    pinchRef.current = null;
    dragRef.current = null;
  }, [open]);

  useEffect(() => {
    frameReadyRef.current = false;
    setPreviewReady(false);
    setPreviewError("");
    setPrintPageCount(0);
    setActivePrintPage(0);

    if (!open || !previewUrl) return;

    const timeoutId = window.setTimeout(() => {
      if (!frameReadyRef.current) {
        setPreviewError("تعذر تحميل مستند المعاينة. حاول إغلاق النافذة وفتحها مرة أخرى.");
      }
    }, 15000);

    return () => window.clearTimeout(timeoutId);
  }, [open, previewReloadVersion, previewUrl]);

  if (!open) return null;

  const scale = fitMode ? fitScale : zoomPercent / 100;
  const displayedZoom = fitMode ? Math.round(fitScale * 100) : zoomPercent;

  function getPanBounds(nextScale = scale) {
    const viewport = frameRef.current;
    if (!viewport) return { x: 0, y: 0 };

    return {
      x: Math.max(0, (documentWidth * nextScale - viewport.clientWidth) / 2),
      y: Math.max(0, (documentHeight * nextScale - viewport.clientHeight) / 2),
    };
  }

  function clampPan(nextPan: { x: number; y: number }, nextScale = scale) {
    const bounds = getPanBounds(nextScale);
    return {
      x: Math.min(bounds.x, Math.max(-bounds.x, nextPan.x)),
      y: Math.min(bounds.y, Math.max(-bounds.y, nextPan.y)),
    };
  }

  function fitPreview() {
    setFitMode(true);
    setPan({ x: 0, y: 0 });
  }

  function retryPreview() {
    setPreviewReloadVersion((current) => current + 1);
  }

  function getPrintPages() {
    if (!pageSelector) return [] as HTMLElement[];
    return Array.from(iframeRef.current?.contentDocument?.querySelectorAll<HTMLElement>(pageSelector) || [])
      .filter((page) => !page.closest(".activity-plan-print-measurement"));
  }

  function syncPrintPages() {
    const count = getPrintPages().length;
    setPrintPageCount(count);
    setActivePrintPage((current) => Math.min(Math.max(0, current), Math.max(0, count - 1)));
  }

  function goToPrintPage(nextPage: number) {
    const pages = getPrintPages();
    const boundedPage = Math.min(Math.max(0, nextPage), Math.max(0, pages.length - 1));
    const page = pages[boundedPage];
    if (!page) return;

    const frameWindow = iframeRef.current?.contentWindow;
    const top = page.getBoundingClientRect().top + (frameWindow?.scrollY || 0);
    frameWindow?.scrollTo({ top, behavior: "smooth" });
    iframeRef.current?.contentDocument?.scrollingElement?.scrollTo({ top, behavior: "smooth" });
    setActivePrintPage(boundedPage);
  }

  function startPinch(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 2) return;
    event.preventDefault();
    pinchRef.current = {
      startDistance: getTouchDistance(event.touches),
      startZoom: displayedZoom,
    };
    dragRef.current = null;
  }

  function startDrag(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 1 || pinchRef.current || scale <= fitScale + 0.01) return;
    const touch = event.touches[0];
    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    };
  }

  function movePinch(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 2) return;
    event.preventDefault();

    const pinch = pinchRef.current || {
      startDistance: getTouchDistance(event.touches),
      startZoom: displayedZoom,
    };
    pinchRef.current = pinch;

    const distance = getTouchDistance(event.touches);
    if (!pinch.startDistance || !distance) return;
    setFitMode(false);
    const nextZoom = Math.min(
      MAX_ZOOM_PERCENT,
      Math.max(MIN_ZOOM_PERCENT, Math.round(pinch.startZoom * (distance / pinch.startDistance))),
    );
    setZoomPercent(nextZoom);
    setPan((currentPan) => clampPan(currentPan, nextZoom / 100));
  }

  function moveDrag(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 1 || !dragRef.current || pinchRef.current) return;
    event.preventDefault();
    const touch = event.touches[0];
    const drag = dragRef.current;
    setPan(clampPan({
      x: drag.startPanX + touch.clientX - drag.startX,
      y: drag.startPanY + touch.clientY - drag.startY,
    }));
  }

  function movePreview(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length === 2) {
      movePinch(event);
      return;
    }
    moveDrag(event);
  }

  function endPinch(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length < 2) {
      pinchRef.current = null;
      if (event.touches.length === 1 && scale > fitScale + 0.01) startDrag(event);
    }
    if (event.touches.length === 0) dragRef.current = null;
  }

  function panWithWheel(event: WheelEvent<HTMLDivElement>) {
    if (!pan.x && !pan.y && scale <= fitScale) return;
    event.preventDefault();
    setPan((currentPan) => clampPan({
      x: currentPan.x - event.deltaX,
      y: currentPan.y - event.deltaY,
    }));
  }

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
      className="fixed inset-0 z-[120] flex max-w-full items-center justify-center overflow-x-clip bg-slate-950/60 p-2.5 backdrop-blur-md sm:p-4"
      dir="rtl"
      onClick={onClose}
    >
      <style>{`@media (hover: none) and (pointer: coarse) { .curriculum-preview-gesture-frame:not(.curriculum-preview-document-scroll) iframe { pointer-events: none !important; } }`}</style>
      <section
        className="flex h-[84dvh] max-h-[84dvh] w-full max-w-[450px] flex-col overflow-hidden rounded-[1.75rem] border border-white/80 bg-white shadow-2xl shadow-slate-950/35 sm:h-[94vh] sm:max-h-[94vh] sm:max-w-[1200px]"
        onClick={(event) => event.stopPropagation()}
        aria-label={`معاينة ${documentLabel}`}
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100/90 bg-white/95 px-3 py-3 shadow-[0_2px_14px_rgba(15,23,42,0.035)] sm:px-5 sm:py-3.5">
          <div className="min-w-0 pe-1">
            <h2 className="truncate text-[15px] font-black tracking-tight text-slate-950 sm:text-base">{title}</h2>
            <p className="mt-0.5 hidden truncate text-[11px] font-bold text-slate-500 sm:block">
              {subtitle}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {printPageCount > 1 ? <div className="flex h-9 items-center gap-0.5 rounded-xl border border-sky-100 bg-sky-50/70 p-1 text-xs font-black text-slate-700 shadow-sm" dir="ltr" aria-label="التنقل بين صفحات المعاينة">
              <button type="button" onClick={() => goToPrintPage(activePrintPage - 1)} disabled={activePrintPage === 0} className="flex h-7 w-7 items-center justify-center rounded-lg text-sky-700 transition hover:bg-white hover:text-sky-900 disabled:cursor-not-allowed disabled:text-slate-300" aria-label="الصفحة السابقة"><ChevronLeft className="h-4 w-4" /></button>
              <span className="min-w-[3.1rem] text-center text-[11px] tabular-nums text-slate-700">{activePrintPage + 1} / {printPageCount}</span>
              <button type="button" onClick={() => goToPrintPage(activePrintPage + 1)} disabled={activePrintPage >= printPageCount - 1} className="flex h-7 w-7 items-center justify-center rounded-lg text-teal-700 transition hover:bg-white hover:text-teal-900 disabled:cursor-not-allowed disabled:text-slate-300" aria-label="الصفحة التالية"><ChevronRight className="h-4 w-4" /></button>
            </div> : null}
            <button type="button" onClick={fitPreview} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-teal-100 bg-teal-50/70 px-2.5 text-[11px] font-black text-teal-800 shadow-sm transition hover:bg-white hover:text-teal-950" aria-label="ملاءمة المعاينة"><Expand className="h-3.5 w-3.5" />Fit</button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 shadow-sm transition hover:bg-slate-100 hover:text-slate-800"
              aria-label="إغلاق المعاينة"
            >
                  <X className="h-[18px] w-[18px]" />
            </button>
          </div>
        </header>

        <div
          ref={frameRef}
          className={`curriculum-preview-gesture-frame relative min-h-0 flex-1 overflow-hidden overscroll-contain bg-gradient-to-b from-slate-100 via-slate-100 to-sky-50/70 p-2 sm:min-h-[220px] sm:p-3${allowDocumentScroll ? " curriculum-preview-document-scroll" : ""}`}
          onTouchStart={(event) => {
            startPinch(event);
            startDrag(event);
          }}
          onTouchMove={movePreview}
          onTouchEnd={endPinch}
          onTouchCancel={endPinch}
          onWheel={panWithWheel}
          style={{ touchAction: "none" }}
        >
          <div
            className="absolute left-1/2 top-1/2 overflow-hidden rounded-[0.9rem] bg-white shadow-[0_14px_36px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/80"
            style={{
              width: `${documentWidth}px`,
              height: `${documentHeight}px`,
              transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${scale})`,
              transformOrigin: "center center",
            }}
          >
            {!previewReady && !previewError ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white text-center text-sm font-black text-slate-600">
                <Loader2 className="h-7 w-7 animate-spin text-sky-600" aria-hidden="true" />
                <span>جارٍ تحميل المعاينة...</span>
              </div>
            ) : null}
            {previewError ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white px-5 text-center text-sm font-bold text-rose-700" role="alert">
                <span>{previewError}</span>
                <button type="button" onClick={retryPreview} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200">إعادة المحاولة</button>
              </div>
            ) : null}
            <iframe
              key={`${previewUrl}:${previewReloadVersion}`}
              ref={iframeRef}
              title={`معاينة تقرير ${documentLabel}`}
              src={previewUrl}
              className="absolute inset-0 block border-0 bg-white"
              onLoad={(event) => {
                const reportDocument = event.currentTarget.contentDocument;
                if (!reportDocument) {
                  frameReadyRef.current = true;
                  setPreviewError(documentNotFoundMessage);
                  return;
                }

                try {
                  const requestedUrl = new URL(previewUrl, window.location.origin);
                  const loadedUrl = new URL(reportDocument.location.href);
                  if (
                    loadedUrl.origin !== requestedUrl.origin ||
                    loadedUrl.pathname !== requestedUrl.pathname ||
                    loadedUrl.search !== requestedUrl.search
                  ) {
                    frameReadyRef.current = true;
                    setPreviewReady(false);
                    setPreviewError(documentNotFoundMessage);
                    if (process.env.NODE_ENV !== "production") {
                      console.warn("PREVIEW_DOCUMENT_URL_MISMATCH", {
                        requested: requestedUrl.href,
                        loaded: loadedUrl.href,
                      });
                    }
                    return;
                  }
                } catch {
                  frameReadyRef.current = true;
                  setPreviewReady(false);
                  setPreviewError(documentNotFoundMessage);
                  return;
                }

                if (hideDocumentScrollbars) {
                  const style = reportDocument.createElement("style");
                  style.textContent = `
                    html, body {
                      scrollbar-width: none !important;
                      -ms-overflow-style: none !important;
                    }
                    html::-webkit-scrollbar,
                    body::-webkit-scrollbar {
                      display: none !important;
                    }
                  `;
                  reportDocument.head.appendChild(style);
                }

                let attempts = 0;
                const waitForDocument = () => {
                  if (frameReadyRef.current) return;

                  const hasReport = Boolean(reportDocument.querySelector(documentSelector));
                  if (hasReport) {
                    frameReadyRef.current = true;
                    setPreviewReady(true);
                    syncPrintPages();
                    if (pageSelector && reportDocument.body) {
                      const pageObserver = new MutationObserver(syncPrintPages);
                      pageObserver.observe(reportDocument.body, { childList: true, subtree: true });
                    }
                    return;
                  }

                  attempts += 1;
                  if (attempts < 150) {
                    window.setTimeout(waitForDocument, 100);
                    return;
                  }

                  frameReadyRef.current = true;
                  setPreviewError(documentNotFoundMessage);
                };

                waitForDocument();
              }}
              onError={() => {
                frameReadyRef.current = true;
                setPreviewError("تعذر تحميل مستند المعاينة. حاول مرة أخرى.");
              }}
              style={{
                width: `${documentWidth}px`,
                height: `${documentHeight}px`,
                pointerEvents: allowDocumentScroll ? "auto" : "none",
              }}
            />
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-100/90 bg-gradient-to-b from-white to-slate-50/80 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
          {error ? (
            <p className="mb-2 rounded-xl bg-rose-50 px-3 py-2 text-center text-xs font-bold text-rose-700">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => void download()}
              disabled={downloading}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-sky-600 to-cyan-600 text-sm font-black text-white shadow-lg shadow-sky-200/80 transition hover:from-sky-700 hover:to-cyan-700 disabled:cursor-wait disabled:opacity-60"
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {downloading ? "جارٍ تجهيز التحميل..." : "تحميل / طباعة"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              إغلاق
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
