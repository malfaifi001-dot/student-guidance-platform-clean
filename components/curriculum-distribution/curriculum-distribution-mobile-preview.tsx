"use client";

import { useEffect, useRef, useState } from "react";
import type { TouchEvent, TouchList, WheelEvent } from "react";
import { Download, Loader2, Minus, Plus, X } from "lucide-react";

const A4_LANDSCAPE_WIDTH = 1122;
const A4_LANDSCAPE_HEIGHT = 794;
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
  allowDocumentScroll = false,
}: {
  open: boolean;
  previewUrl: string;
  onDownload: () => Promise<boolean>;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  documentSelector?: string;
  allowDocumentScroll?: boolean;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    if (!open) return;

    const updateScale = () => {
      const frame = frameRef.current;
      if (!frame) return;

      const availableWidth = Math.max(280, frame.clientWidth - 16);
      const availableHeight = Math.max(220, frame.clientHeight - 16);
      const widthScale = availableWidth / A4_LANDSCAPE_WIDTH;
      const heightScale = availableHeight / A4_LANDSCAPE_HEIGHT;
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
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setZoomPercent(100);
    setFitMode(window.innerWidth < 640);
    setPan({ x: 0, y: 0 });
    pinchRef.current = null;
    dragRef.current = null;
  }, [open]);

  useEffect(() => {
    frameReadyRef.current = false;
    setPreviewReady(false);
    setPreviewError("");

    if (!open || !previewUrl) return;

    const timeoutId = window.setTimeout(() => {
      if (!frameReadyRef.current) {
        setPreviewError("تعذر تحميل مستند المعاينة. حاول إغلاق النافذة وفتحها مرة أخرى.");
      }
    }, 15000);

    return () => window.clearTimeout(timeoutId);
  }, [open, previewUrl]);

  if (!open) return null;

  const scale = fitMode ? fitScale : zoomPercent / 100;
  const displayedZoom = fitMode ? Math.round(fitScale * 100) : zoomPercent;

  function getPanBounds(nextScale = scale) {
    const viewport = frameRef.current;
    if (!viewport) return { x: 0, y: 0 };

    return {
      x: Math.max(0, (A4_LANDSCAPE_WIDTH * nextScale - viewport.clientWidth) / 2),
      y: Math.max(0, (A4_LANDSCAPE_HEIGHT * nextScale - viewport.clientHeight) / 2),
    };
  }

  function clampPan(nextPan: { x: number; y: number }, nextScale = scale) {
    const bounds = getPanBounds(nextScale);
    return {
      x: Math.min(bounds.x, Math.max(-bounds.x, nextPan.x)),
      y: Math.min(bounds.y, Math.max(-bounds.y, nextPan.y)),
    };
  }

  function changeZoom(nextZoom: number) {
    const clampedZoom = Math.min(MAX_ZOOM_PERCENT, Math.max(MIN_ZOOM_PERCENT, nextZoom));
    setFitMode(false);
    setZoomPercent(clampedZoom);
    setPan((currentPan) => clampPan(currentPan, clampedZoom / 100));
  }

  function fitPreview() {
    setFitMode(true);
    setPan({ x: 0, y: 0 });
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
    if (event.touches.length !== 1 || pinchRef.current) return;
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
    if (event.touches.length < 2) pinchRef.current = null;
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
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-4"
      dir="rtl"
      onClick={onClose}
    >
      <section
        className="flex h-[80dvh] max-h-[80dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-2xl shadow-sky-950/30 sm:h-[94vh] sm:max-h-[94vh] sm:max-w-[1200px]"
        onClick={(event) => event.stopPropagation()}
        aria-label="معاينة توزيع المنهج"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5 sm:px-5 sm:py-3.5">
          <div className="min-w-0">
            <h2 className="text-base font-black text-slate-950">{title}</h2>
            <p className="mt-0.5 text-[11px] font-bold text-slate-500">
              {subtitle}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-0.5" dir="ltr" aria-label="zoom controls">
              <button type="button" onClick={() => changeZoom((fitMode ? displayedZoom : zoomPercent) - 10)} disabled={!fitMode && zoomPercent <= MIN_ZOOM_PERCENT} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-white hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Zoom out"><Minus className="h-3.5 w-3.5" /></button>
              <span className="min-w-[3.2rem] text-center text-[11px] font-black tabular-nums text-slate-700">{displayedZoom}%</span>
              <button type="button" onClick={() => changeZoom((fitMode ? displayedZoom : zoomPercent) + 10)} disabled={!fitMode && zoomPercent >= MAX_ZOOM_PERCENT} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-white hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Zoom in"><Plus className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={fitPreview} className="h-7 rounded-lg px-1.5 text-[10px] font-black text-slate-600 transition hover:bg-white hover:text-sky-700" aria-label="Fit preview">Fit</button>
            </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            aria-label="إغلاق المعاينة"
          >
            <X className="h-5 w-5" />
          </button>
          </div>
        </header>

        <div
          ref={frameRef}
          className="relative min-h-0 flex-1 overflow-hidden overscroll-contain bg-slate-100 p-2.5 sm:min-h-[220px] sm:p-3"
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
            className="absolute left-1/2 top-1/2 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200"
            style={{
              width: `${A4_LANDSCAPE_WIDTH}px`,
              height: `${A4_LANDSCAPE_HEIGHT}px`,
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
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white px-5 text-center text-sm font-bold text-rose-700" role="alert">
                {previewError}
              </div>
            ) : null}
            <iframe
              key={previewUrl}
              title="معاينة تقرير توزيع المنهج"
              src={previewUrl}
              className="absolute inset-0 block border-0 bg-white"
              onLoad={(event) => {
                const reportDocument = event.currentTarget.contentDocument;
                const hasReport = Boolean(reportDocument?.querySelector(documentSelector));

                if (!hasReport) {
                  frameReadyRef.current = true;
                  setPreviewError("تعذر العثور على مستند توزيع المنهج في المعاينة.");
                  return;
                }

                frameReadyRef.current = true;
                setPreviewReady(true);
              }}
              onError={() => {
                frameReadyRef.current = true;
                setPreviewError("تعذر تحميل مستند المعاينة. حاول مرة أخرى.");
              }}
              style={{
                width: `${A4_LANDSCAPE_WIDTH}px`,
                height: `${A4_LANDSCAPE_HEIGHT}px`,
                pointerEvents: allowDocumentScroll ? "auto" : "none",
              }}
            />
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-100 bg-white p-2.5 sm:p-4">
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
              {downloading ? "جارٍ تجهيز التحميل..." : "تحميل / طباعة"}
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
