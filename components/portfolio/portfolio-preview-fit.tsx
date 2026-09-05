"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type PortfolioPreviewFitProps = {
  children: ReactNode;
};

type PreviewDimensions = {
  width: number;
  height: number;
  scale: number;
};

const INITIAL_DIMENSIONS: PreviewDimensions = {
  width: 0,
  height: 0,
  scale: 1,
};

export function PortfolioPreviewFit({ children }: PortfolioPreviewFitProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] =
    useState<PreviewDimensions>(INITIAL_DIMENSIONS);

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

        const fitScale = availableWidth / logicalWidth;
        const previewScale = Math.min(1, fitScale);
        const nextDimensions = {
          width: logicalWidth * previewScale,
          height: logicalHeight * previewScale,
          scale: previewScale,
        };

        setDimensions((current) => {
          const isUnchanged =
            Math.abs(current.width - nextDimensions.width) < 0.5 &&
            Math.abs(current.height - nextDimensions.height) < 0.5 &&
            Math.abs(current.scale - nextDimensions.scale) < 0.001;

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
    updatePreviewScale();

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", updatePreviewScale);
      window.removeEventListener("orientationchange", updatePreviewScale);
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <section className="w-full min-w-0 max-w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-2 shadow-sm sm:p-3 lg:p-4">
      <div
        ref={viewportRef}
        className="relative w-full min-w-0 max-w-full overflow-hidden rounded-[1.5rem] bg-slate-100 py-3 sm:py-4 lg:py-5"
      >
        <div
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
