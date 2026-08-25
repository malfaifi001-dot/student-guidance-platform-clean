"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type PreviewDimensions = {
  logicalWidth: number;
  scaledWidth: number;
  scaledHeight: number;
  scale: number;
};

const INITIAL_DIMENSIONS: PreviewDimensions = {
  logicalWidth: 0,
  scaledWidth: 0,
  scaledHeight: 0,
  scale: 1,
};

export function A4PreviewFit({
  children,
  pageSelector,
}: {
  children: ReactNode;
  pageSelector: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<PreviewDimensions>(INITIAL_DIMENSIONS);

  useEffect(() => {
    const viewport = viewportRef.current;
    const stage = stageRef.current;
    if (!viewport || !stage) return;

    let frameId = 0;
    const updatePreviewScale = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const page = stage.querySelector<HTMLElement>(pageSelector);
        if (!page) return;
        const screenWidth = window.visualViewport?.width || document.documentElement.clientWidth || window.innerWidth;
        const viewportWidth = Math.min(viewport.clientWidth, screenWidth);
        const safeHorizontalGap = viewportWidth < 640 ? 24 : viewportWidth < 1180 ? 32 : 40;
        const availableWidth = Math.max(0, viewportWidth - safeHorizontalGap);
        const logicalWidth = page.offsetWidth;
        const naturalStageHeight = Math.max(stage.scrollHeight, stage.offsetHeight);
        if (!logicalWidth || !naturalStageHeight || !availableWidth) return;
        const fitScale = Math.min(1, availableWidth / logicalWidth);
        const nextDimensions = { logicalWidth, scaledWidth: logicalWidth * fitScale, scaledHeight: naturalStageHeight * fitScale, scale: fitScale };
        setDimensions((current) => {
          const unchanged = current.logicalWidth === nextDimensions.logicalWidth && Math.abs(current.scaledWidth - nextDimensions.scaledWidth) < 0.5 && Math.abs(current.scaledHeight - nextDimensions.scaledHeight) < 0.5 && Math.abs(current.scale - nextDimensions.scale) < 0.001;
          return unchanged ? current : nextDimensions;
        });
      });
    };

    const resizeObserver = new ResizeObserver(updatePreviewScale);
    resizeObserver.observe(viewport);
    resizeObserver.observe(stage);
    const mutationObserver = new MutationObserver(updatePreviewScale);
    mutationObserver.observe(stage, { childList: true, subtree: true, attributes: true });
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
  }, [pageSelector]);

  return (
    <>
      <style>{`
        .a4-preview-fit-viewport { width:100%; min-width:0; overflow:hidden; padding:12px; background:#f1f5f9; }
        .a4-preview-fit-scaled { position:relative; margin-inline:auto; }
        .a4-preview-fit-stage { position:absolute; top:0; left:0; transform-origin:top left; }
      `}</style>
      <div ref={viewportRef} className="a4-preview-fit-viewport">
        <div className="a4-preview-fit-scaled" style={{ width: dimensions.scaledWidth, height: dimensions.scaledHeight }}>
          <div ref={stageRef} className="a4-preview-fit-stage" style={{ width: dimensions.logicalWidth || undefined, transform: `scale(${dimensions.scale})` }}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
