"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { GuidanceStep } from "@/lib/guidance/guidance-types";

type Rect = { top: number; left: number; width: number; height: number };
const CARD_WIDTH = 360;
const PADDING = 16;

function clamp(value: number, min: number, max: number) { return Math.min(Math.max(value, min), max); }
function targetFor(step: GuidanceStep) { return document.querySelector<HTMLElement>(`[data-guidance="${step.target}"]`); }
function isUsable(element: HTMLElement | null) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
}

export function GuidanceOverlay({ steps, initialIndex, onProgress, onComplete, onSkip }: { steps: GuidanceStep[]; initialIndex: number; onProgress: (index: number) => void; onComplete: (index: number) => void; onSkip: (index: number) => void }) {
  const [index, setIndex] = useState(initialIndex);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = steps[index] || null;

  const findValid = useCallback((start: number, direction: 1 | -1) => {
    for (let i = start; i >= 0 && i < steps.length; i += direction) if (isUsable(targetFor(steps[i]))) return i;
    return -1;
  }, [steps]);

  const sync = useCallback(() => {
    if (!step) return;
    const target = targetFor(step);
    if (!isUsable(target)) {
      const next = findValid(index + 1, 1);
      if (next >= 0) setIndex(next); else onComplete(index);
      return;
    }
    const value = target!.getBoundingClientRect();
    if (value.bottom < PADDING || value.top > window.innerHeight - PADDING) target!.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    setRect({ top: value.top, left: value.left, width: value.width, height: value.height });
  }, [findValid, index, onComplete, step]);

  useEffect(() => { onProgress(index); const frame = requestAnimationFrame(sync); window.addEventListener("resize", sync); window.addEventListener("scroll", sync, true); return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", sync); window.removeEventListener("scroll", sync, true); }; }, [index, onProgress, sync]);

  const position = useMemo(() => {
    if (!rect || typeof window === "undefined") return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    const left = clamp(rect.left + rect.width - CARD_WIDTH, PADDING, Math.max(PADDING, window.innerWidth - CARD_WIDTH - PADDING));
    const below = rect.top + rect.height + PADDING;
    const top = below + 230 <= window.innerHeight ? below : Math.max(PADDING, rect.top - 230);
    return { top: `${top}px`, left: `${left}px`, transform: "none" };
  }, [rect]);

  if (!step || typeof document === "undefined") return null;
  const previous = findValid(index - 1, -1);
  const next = findValid(index + 1, 1);

  return createPortal(<div className="fixed inset-0 z-[160]" dir="rtl">
    <div className="absolute inset-0 bg-slate-950/45" />
    {rect ? <div className="pointer-events-none fixed z-[161] rounded-[2rem] border-2 border-sky-300 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] transition-all duration-200" style={{ top: rect.top - 8, left: rect.left - 8, width: rect.width + 16, height: rect.height + 16 }} /> : null}
    <section className="fixed z-[162] w-[calc(100vw-2rem)] max-w-[360px] rounded-[2rem] border border-slate-200 bg-white p-5 text-right text-slate-950 shadow-2xl" style={position}>
      <p className="text-xs font-black text-sky-700">الخطوة {index + 1} من {steps.length}</p>
      <h2 className="mt-2 text-xl font-black">{step.title}</h2>
      {step.description ? <p className="mt-3 text-sm font-bold leading-7 text-slate-600">{step.description}</p> : null}
      <div className="mt-5 flex items-center justify-between gap-3">
        <button type="button" onClick={() => onSkip(index)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 hover:bg-slate-50">تخطي</button>
        <div className="flex gap-2">
          {previous >= 0 ? <button type="button" onClick={() => setIndex(previous)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">السابق</button> : null}
          {next >= 0 ? <button type="button" onClick={() => setIndex(next)} className="rounded-full bg-sky-600 px-4 py-2 text-sm font-black text-white hover:bg-sky-700">التالي</button> : <button type="button" onClick={() => onComplete(index)} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-800">إنهاء</button>}
        </div>
      </div>
    </section>
  </div>, document.body);
}
