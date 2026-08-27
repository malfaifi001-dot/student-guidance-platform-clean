"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

export type SignaturePadHandle = {
  clear: () => void;
};

type SignaturePadProps = {
  height?: number;
  disabled?: boolean;
  className?: string;
  onChange: (dataUrl: string) => void;
};

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad(
    { height = 220, disabled = false, className = "", onChange },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const drawingRef = useRef(false);
    const hasSignatureRef = useRef(false);

    function configureCanvas() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      const displayWidth = Math.max(1, Math.floor(rect.width));
      const displayHeight = Math.max(1, Math.floor(height));

      canvas.width = Math.max(1, Math.floor(displayWidth * ratio));
      canvas.height = Math.max(1, Math.floor(displayHeight * ratio));

      const context = canvas.getContext("2d");
      if (!context) return;

      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, displayWidth, displayHeight);
      context.lineWidth = 3;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "#0f172a";
    }

    function getPoint(event: React.PointerEvent<HTMLCanvasElement>) {
      const rect = event.currentTarget.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    }

    function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
      if (disabled) return;
      const context = event.currentTarget.getContext("2d");
      if (!context) return;

      drawingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      const point = getPoint(event);
      context.beginPath();
      context.moveTo(point.x, point.y);
    }

    function draw(event: React.PointerEvent<HTMLCanvasElement>) {
      if (!drawingRef.current || disabled) return;
      const context = event.currentTarget.getContext("2d");
      if (!context) return;

      const point = getPoint(event);
      context.lineTo(point.x, point.y);
      context.stroke();
      hasSignatureRef.current = true;
    }

    function stopDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
      if (!drawingRef.current) return;
      drawingRef.current = false;

      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // The pointer may already have been released by the browser.
      }

      if (hasSignatureRef.current) {
        onChange(event.currentTarget.toDataURL("image/png"));
      }
    }

    function clear() {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context || disabled) return;

      const rect = canvas.getBoundingClientRect();
      context.clearRect(0, 0, rect.width, height);
      hasSignatureRef.current = false;
      onChange("");
    }

    useImperativeHandle(ref, () => ({ clear }), [disabled, height, onChange]);

    useEffect(() => {
      configureCanvas();

      const canvas = canvasRef.current;
      const resizeObserver = canvas && "ResizeObserver" in window
        ? new ResizeObserver(configureCanvas)
        : null;
      if (resizeObserver && canvas) resizeObserver.observe(canvas);
      window.addEventListener("resize", configureCanvas);

      return () => {
        resizeObserver?.disconnect();
        window.removeEventListener("resize", configureCanvas);
      };
    }, [height]);

    return (
      <canvas
        ref={canvasRef}
        className={`block w-full touch-none ${className}`}
        style={{ height: `${height}px` }}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerCancel={stopDrawing}
      />
    );
  },
);
