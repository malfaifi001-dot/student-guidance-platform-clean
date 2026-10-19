"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  usePreviewZoomScroll,
  type PreviewZoomScrollGeometry,
} from "@/components/preview/use-preview-zoom-scroll";

type PortfolioPreviewFitProps = {
  children: ReactNode;
};

type PreviewDimensions = {
  width: number;
  height: number;
  scale: number;
  fitScale: number;
  logicalWidth: number;
  logicalHeight: number;
};

const INITIAL_DIMENSIONS: PreviewDimensions = {
  width: 0,
  height: 0,
  scale: 1,
  fitScale: 1,
  logicalWidth: 0,
  logicalHeight: 0,
};

const MIN_ZOOM_FACTOR = 0.75;
const MAX_ZOOM_FACTOR = 2.5;

export function PortfolioPreviewFit({ children }: PortfolioPreviewFitProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const scaledFrameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] =
    useState<PreviewDimensions>(INITIAL_DIMENSIONS);
  const dimensionsRef = useRef(INITIAL_DIMENSIONS);
  const zoomFactorRef = useRef(1);
  const geometryRef = useRef<PreviewZoomScrollGeometry>({
    logicalWidth: INITIAL_DIMENSIONS.logicalWidth,
    logicalHeight: INITIAL_DIMENSIONS.logicalHeight,
    fitScale: INITIAL_DIMENSIONS.fitScale,
    scale: INITIAL_DIMENSIONS.scale,
  });

  const applyPreviewScale = (
    nextScale: number,
    nextDimensions: PreviewDimensions,
    shouldUpdateState = true,
  ) => {
    dimensionsRef.current = nextDimensions;

    if (scaledFrameRef.current) {
      scaledFrameRef.current.style.width = `${nextDimensions.width}px`;
      scaledFrameRef.current.style.height = `${nextDimensions.height}px`;
    }

    if (stageRef.current) {
      stageRef.current.style.transform = `scale(${nextScale})`;
    }

    if (shouldUpdateState) setDimensions(nextDimensions);
  };

  const fitToViewport = () => {
    const current = dimensionsRef.current;
    zoomFactorRef.current = 1;
    const nextScale = current.fitScale;
    applyPreviewScale(
      nextScale,
      {
        ...current,
        width: current.logicalWidth * nextScale,
        height: current.logicalHeight * nextScale,
        scale: nextScale,
      },
    );

    previewInteraction.resetZoom();
  };

  const previewInteraction = usePreviewZoomScroll({
    enabled: true,
    viewportRef,
    stageRef,
    geometryRef,
    zoomFactorRef,
    minZoomFactor: MIN_ZOOM_FACTOR,
    maxZoomFactor: MAX_ZOOM_FACTOR,
    onZoomFactorChange: (nextZoomFactor) => {
      const current = dimensionsRef.current;
      const nextScale = current.fitScale * nextZoomFactor;
      applyPreviewScale(
        nextScale,
        {
          ...current,
          width: current.logicalWidth * nextScale,
          height: current.logicalHeight * nextScale,
          scale: nextScale,
        },
        false,
      );
    },
  });

  useEffect(() => {
    const viewport = viewportRef.current;
    const stage = stageRef.current;

    if (!viewport || !stage) return;

    let frameId = 0;

    const updatePreviewScale = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const screenWidth =
          window.visualViewport?.width ||
          document.documentElement.clientWidth ||
          window.innerWidth;
        const viewportWidth = Math.min(viewport.clientWidth, screenWidth);
        const safeHorizontalGap =
          viewportWidth < 640 ? 24 : viewportWidth < 1180 ? 32 : 40;
        const availableWidth = Math.max(
          0,
          viewportWidth - safeHorizontalGap,
        );
        const logicalWidth = Math.max(stage.scrollWidth, stage.offsetWidth);
        const logicalHeight = Math.max(stage.scrollHeight, stage.offsetHeight);

        if (!logicalWidth || !logicalHeight || !availableWidth) return;

        const fitScale = Math.min(1, availableWidth / logicalWidth);
        const previewScale = fitScale * zoomFactorRef.current;
        const nextDimensions = {
          width: logicalWidth * previewScale,
          height: logicalHeight * previewScale,
          scale: previewScale,
          fitScale,
          logicalWidth,
          logicalHeight,
        };

        dimensionsRef.current = nextDimensions;
        geometryRef.current = {
          logicalWidth,
          logicalHeight,
          fitScale,
          scale: previewScale,
        };
        if (scaledFrameRef.current) {
          scaledFrameRef.current.style.width = `${nextDimensions.width}px`;
          scaledFrameRef.current.style.height = `${nextDimensions.height}px`;
        }
        if (stageRef.current) {
          stageRef.current.style.transform = `scale(${nextDimensions.scale})`;
        }

        setDimensions((current) => {
          const isUnchanged =
            Math.abs(current.width - nextDimensions.width) < 0.5 &&
            Math.abs(current.height - nextDimensions.height) < 0.5 &&
            Math.abs(current.scale - nextDimensions.scale) < 0.001 &&
            Math.abs(current.fitScale - nextDimensions.fitScale) < 0.001;

          return isUnchanged ? current : nextDimensions;
        });
      });
    };

    const resizeObserver = new ResizeObserver(updatePreviewScale);
    resizeObserver.observe(viewport);
    resizeObserver.observe(stage);

    const isInsideMeasurementCandidate = (node: Node | null) => {
      const element =
        node instanceof Element ? node : node?.parentElement;
      return Boolean(
        element?.closest(
          "[data-portfolio-measurement-candidate], [data-portfolio-page-measurement]",
        ),
      );
    };

    const mutationObserver = new MutationObserver((mutations) => {
      const affectsVisiblePreview = mutations.some((mutation) => {
        if (mutation.type === "attributes" || mutation.type === "characterData") {
          return !isInsideMeasurementCandidate(mutation.target);
        }

        if (isInsideMeasurementCandidate(mutation.target)) return false;

        return [
          ...Array.from(mutation.addedNodes),
          ...Array.from(mutation.removedNodes),
        ].some((node) => !isInsideMeasurementCandidate(node));
      });

      if (affectsVisiblePreview) updatePreviewScale();
    });
    mutationObserver.observe(stage, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    window.addEventListener("resize", updatePreviewScale);
    window.addEventListener("orientationchange", updatePreviewScale);
    window.visualViewport?.addEventListener("resize", updatePreviewScale);
    updatePreviewScale();

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", updatePreviewScale);
      window.removeEventListener("orientationchange", updatePreviewScale);
      window.visualViewport?.removeEventListener("resize", updatePreviewScale);
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <section className="w-full min-w-0 max-w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-2 shadow-sm sm:p-3 lg:p-4">
      <style>{`
        [data-portfolio-preview-stage] [data-portfolio-smart-phase="frozen"] .portfolio-page,
        [data-portfolio-preview-stage] [data-portfolio-smart-phase="frozen"] .portfolio-report-page,
        [data-portfolio-preview-stage] [data-portfolio-smart-phase="frozen"] .atlas-page,
        [data-portfolio-preview-stage] [data-portfolio-smart-phase="frozen"] .hzn-page,
        [data-portfolio-preview-stage] [data-portfolio-smart-phase="frozen"] .moe24-page {
          content-visibility: auto;
          contain-intrinsic-size: 210mm 297mm;
        }

        @media print {
          [data-portfolio-preview-stage] [data-portfolio-smart-phase="frozen"] .portfolio-page,
          [data-portfolio-preview-stage] [data-portfolio-smart-phase="frozen"] .portfolio-report-page,
          [data-portfolio-preview-stage] [data-portfolio-smart-phase="frozen"] .atlas-page,
          [data-portfolio-preview-stage] [data-portfolio-smart-phase="frozen"] .hzn-page,
          [data-portfolio-preview-stage] [data-portfolio-smart-phase="frozen"] .moe24-page {
            content-visibility: visible;
            contain-intrinsic-size: none;
          }
        }
      `}</style>
      <div className="flex justify-end px-1 pb-1">
        <button
          type="button"
          className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          onClick={fitToViewport}
          aria-label="Fit"
        >
          Fit
        </button>
      </div>
      <div
        ref={viewportRef}
        className="relative w-full min-w-0 max-w-full overflow-x-auto overflow-y-hidden rounded-[1.5rem] bg-slate-100 py-3 sm:py-4 lg:py-5"
        dir="ltr"
        style={{ touchAction: "pan-y" }}
           onTouchStart={previewInteraction.handleTouchStart}
           onTouchMove={previewInteraction.handleTouchMove}
           onTouchEnd={previewInteraction.handleTouchEnd}
           onTouchCancel={previewInteraction.handleTouchEnd}
      >
        <div
          ref={scaledFrameRef}
          className="relative mx-auto overflow-visible"
          style={{
            width: dimensions.width,
            height: dimensions.height,
          }}
        >
          <div
            ref={stageRef}
            data-portfolio-preview-stage="true"
            className="absolute left-0 top-0 w-max max-w-none"
            style={{
              transform: `scale(${dimensions.scale})`,
              transformOrigin: "top left",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
