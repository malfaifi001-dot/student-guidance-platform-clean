"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  completeFeatureTour,
  isFeatureTourCompleted,
} from "@/lib/onboarding/tour-storage";

type FeatureTourStep = {
  targetId: string;
  title: string;
  description?: string;
};

type FeatureTourProps = {
  tourKey: string;
  steps: FeatureTourStep[];
};

type TourRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const CARD_WIDTH = 360;
const VIEWPORT_PADDING = 16;
const STEP_GAP = 16;
const HIGHLIGHT_RADIUS = 28;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function FeatureTour({ tourKey, steps }: FeatureTourProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TourRect | null>(null);

  const activeStep = steps[activeIndex] || null;

  const findNextValidStep = useCallback(
    (startIndex: number) => {
      for (let index = startIndex; index < steps.length; index += 1) {
        const target = document.querySelector(
          `[data-tour-id="${steps[index].targetId}"]`,
        );

        if (target) {
          return index;
        }
      }

      return -1;
    },
    [steps],
  );

  const finishTour = useCallback(() => {
    completeFeatureTour(tourKey);
    setIsVisible(false);
  }, [tourKey]);

  const syncActiveStep = useCallback(() => {
    if (!activeStep) {
      finishTour();
      return;
    }

    const target = document.querySelector(
      `[data-tour-id="${activeStep.targetId}"]`,
    ) as HTMLElement | null;

    if (!target) {
      const nextStepIndex = findNextValidStep(activeIndex + 1);

      if (nextStepIndex === -1) {
        finishTour();
        return;
      }

      setActiveIndex(nextStepIndex);
      return;
    }

    const rect = target.getBoundingClientRect();

    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  }, [activeIndex, activeStep, findNextValidStep, finishTour]);

  useEffect(() => {
    setIsMounted(true);

    if (isFeatureTourCompleted(tourKey)) {
      return;
    }

    const firstStepIndex = findNextValidStep(0);

    if (firstStepIndex === -1) {
      return;
    }

    setActiveIndex(firstStepIndex);
    setIsVisible(true);
  }, [findNextValidStep, tourKey]);

  useEffect(() => {
    if (!isMounted || !isVisible) {
      return;
    }

    syncActiveStep();

    const handleReposition = () => {
      syncActiveStep();
    };

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isMounted, isVisible, syncActiveStep]);

  const cardPosition = useMemo(() => {
    if (!targetRect || typeof window === "undefined") {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const maxLeft = Math.max(
      VIEWPORT_PADDING,
      viewportWidth - CARD_WIDTH - VIEWPORT_PADDING,
    );

    const left = clamp(
      targetRect.left + targetRect.width - CARD_WIDTH,
      VIEWPORT_PADDING,
      maxLeft,
    );

    const preferredBelowTop = targetRect.top + targetRect.height + STEP_GAP;
    const preferredAboveTop = targetRect.top - 220;
    const canShowBelow = preferredBelowTop + 220 <= viewportHeight - VIEWPORT_PADDING;

    return {
      top: canShowBelow
        ? `${preferredBelowTop}px`
        : `${Math.max(VIEWPORT_PADDING, preferredAboveTop)}px`,
      left: `${left}px`,
      transform: "none",
    };
  }, [targetRect]);

  if (!isMounted || !isVisible || !activeStep) {
    return null;
  }

  const isLastStep = activeIndex >= steps.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-slate-950/45" />

      {targetRect ? (
        <div
          className="pointer-events-none fixed z-[121] rounded-[2rem] border-2 border-sky-300 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] transition-all duration-200"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            borderRadius: `${HIGHLIGHT_RADIUS}px`,
          }}
        />
      ) : null}

      <div
        className="fixed z-[122] w-[calc(100vw-2rem)] max-w-[360px] rounded-[2rem] border border-slate-200 bg-white p-5 text-slate-950 shadow-xl"
        dir="rtl"
        style={cardPosition}
      >
        <p className="text-xs font-black text-sky-700">
          {activeIndex + 1} / {steps.length}
        </p>
        <h2 className="mt-2 text-xl font-black">{activeStep.title}</h2>
        {activeStep.description ? (
          <p className="mt-3 text-sm font-bold leading-7 text-slate-600">
            {activeStep.description}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={finishTour}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-50"
          >
            تخطي
          </button>

          <div className="flex flex-wrap gap-2">
            {activeIndex > 0 ? (
              <button
                type="button"
                onClick={() => setActiveIndex((current) => Math.max(0, current - 1))}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                السابق
              </button>
            ) : null}

            {!isLastStep ? (
              <button
                type="button"
                onClick={() => {
                  const nextStepIndex = findNextValidStep(activeIndex + 1);

                  if (nextStepIndex === -1) {
                    finishTour();
                    return;
                  }

                  setActiveIndex(nextStepIndex);
                }}
                className="rounded-full bg-sky-600 px-4 py-2 text-sm font-black text-white transition hover:bg-sky-700"
              >
                التالي
              </button>
            ) : (
              <button
                type="button"
                onClick={finishTour}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800"
              >
                إنهاء
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
