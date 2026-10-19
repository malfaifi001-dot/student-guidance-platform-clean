"use client";

import type {
  RefObject,
  TouchEvent as ReactTouchEvent,
  TouchList,
} from "react";
import { useEffect, useRef } from "react";

export type PreviewZoomScrollGeometry = {
  logicalWidth: number;
  logicalHeight: number;
  fitScale: number;
  scale: number;
};

type PreviewZoomScrollOptions = {
  enabled: boolean;
  viewportRef: RefObject<HTMLDivElement | null>;
  stageRef: RefObject<HTMLElement | null>;
  geometryRef: { current: PreviewZoomScrollGeometry };
  zoomFactorRef: { current: number };
  minZoomFactor: number;
  maxZoomFactor: number;
  onZoomFactorChange: (zoomFactor: number) => void;
};

type PinchState = {
  startDistance: number;
  startZoomFactor: number;
  clientX: number;
  clientY: number;
  localX: number;
  localY: number;
  documentTop: number;
};

type PanState = {
  startX: number;
  startY: number;
  startScrollLeft: number;
  horizontal: boolean;
};

function touchDistance(touches: TouchList) {
  const first = touches[0];
  const second = touches[1];
  if (!first || !second) return 0;
  return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function usePreviewZoomScroll({
  enabled,
  viewportRef,
  stageRef,
  geometryRef,
  zoomFactorRef,
  minZoomFactor,
  maxZoomFactor,
  onZoomFactorChange,
}: PreviewZoomScrollOptions) {
  const pinchRef = useRef<PinchState | null>(null);
  const panRef = useRef<PanState | null>(null);

  const getHorizontalRange = () => {
    const viewport = viewportRef.current;
    if (!viewport) return 0;
    return Math.max(0, viewport.scrollWidth - viewport.clientWidth);
  };

  const getContentOrigin = () => {
    const viewport = viewportRef.current;
    if (!viewport) return 0;
    const style = window.getComputedStyle(viewport);
    return viewport.getBoundingClientRect().left +
      parseFloat(style.borderLeftWidth || "0") +
      parseFloat(style.paddingLeft || "0");
  };

  const setScrollLeft = (nextScrollLeft: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollLeft = clamp(nextScrollLeft, 0, getHorizontalRange());
  };

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (!enabled) return;

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const viewport = viewportRef.current;
      if (!touch || !viewport || getHorizontalRange() <= 0) return;
      panRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startScrollLeft: viewport.scrollLeft,
        horizontal: false,
      };
      return;
    }

    if (event.touches.length !== 2) return;
    panRef.current = null;

    const first = event.touches[0];
    const second = event.touches[1];
    const stage = stageRef.current;
    const viewport = viewportRef.current;
    const scale = geometryRef.current.scale;
    if (!first || !second || !stage || !viewport || !scale) return;

    const clientX = (first.clientX + second.clientX) / 2;
    const clientY = (first.clientY + second.clientY) / 2;
    const stageRect = stage.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    const startDistance = touchDistance(event.touches);
    if (!startDistance) return;

    event.preventDefault();
    pinchRef.current = {
      startDistance,
      startZoomFactor: zoomFactorRef.current,
      clientX,
      clientY,
      localX: (clientX - stageRect.left) / scale,
      localY: (clientY - stageRect.top) / scale,
      documentTop: viewportRect.top + window.scrollY,
    };
  };

  const handleTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (!enabled) return;

    const pinch = pinchRef.current;
    if (!pinch && event.touches.length === 1 && panRef.current) {
      const touch = event.touches[0];
      const pan = panRef.current;
      if (!touch) return;

      const deltaX = touch.clientX - pan.startX;
      const deltaY = touch.clientY - pan.startY;
      if (!pan.horizontal && Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
        pan.horizontal = true;
      }

      if (pan.horizontal) {
        event.preventDefault();
        setScrollLeft(pan.startScrollLeft - deltaX);
      }
      return;
    }

    if (!pinch || event.touches.length < 2) return;
    const distance = touchDistance(event.touches);
    if (!distance) return;

    event.preventDefault();
    const nextZoomFactor = clamp(
      pinch.startZoomFactor * (distance / pinch.startDistance),
      minZoomFactor,
      maxZoomFactor,
    );
    const nextScale = geometryRef.current.fitScale * nextZoomFactor;
    zoomFactorRef.current = nextZoomFactor;
    onZoomFactorChange(nextZoomFactor);

    window.requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      const stage = stageRef.current;
      if (!viewport || !stage) return;

      const contentOrigin = getContentOrigin();
      const desiredScrollLeft =
        (pinch.localX * nextScale) - (pinch.clientX - contentOrigin);
      setScrollLeft(desiredScrollLeft);

      const desiredScrollTop =
        pinch.documentTop + pinch.localY * nextScale - pinch.clientY;
      window.scrollTo({
        top: Math.max(0, desiredScrollTop),
        behavior: "auto",
      });
    });
  };

  const handleTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (event.touches.length < 2) pinchRef.current = null;
    if (event.touches.length < 1) panRef.current = null;
  };

  const resetZoom = () => {
    pinchRef.current = null;
    panRef.current = null;
    zoomFactorRef.current = 1;
    onZoomFactorChange(1);
    window.requestAnimationFrame(() => setScrollLeft(0));
  };

  useEffect(() => {
    if (!enabled) {
      pinchRef.current = null;
      panRef.current = null;
    }
  }, [enabled]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    resetZoom,
    getHorizontalRange,
  };
}
