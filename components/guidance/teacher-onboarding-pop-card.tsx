"use client";

import { Check, Gift, Route, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";

import type { TeacherPerformanceService } from "@/lib/teacher-performance/teacher-performance-services";
import type { TeacherJourneyCard } from "@/lib/guidance/teacher-onboarding-journey";

const GAP = 14;
function clamp(value: number, min: number, max: number) { return Math.min(Math.max(value, min), max); }

export function TeacherOnboardingPopCard({ card, busy, feedback, onPrimary, onPause, onDismiss, onLuckyAnswer, performanceServices = [], selectedPerformanceSlug = "", onPerformanceSelect }: {
  card: TeacherJourneyCard;
  busy?: boolean;
  feedback?: string;
  onPrimary: () => void;
  onPause: () => void;
  onDismiss?: () => void;
  onLuckyAnswer: (answer: number) => void;
  performanceServices?: TeacherPerformanceService[];
  selectedPerformanceSlug?: string;
  onPerformanceSelect?: (slug: string) => void;
}) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const sync = () => {
      const element = card.target ? document.querySelector<HTMLElement>(`[data-guidance="${card.target}"]`) : null;
      if (!element) { setTargetRect(null); return; }
      const rect = element.getBoundingClientRect();
      if (rect.bottom < GAP || rect.top > window.innerHeight - GAP) element.scrollIntoView({ behavior: "smooth", block: "center" });
      setTargetRect(rect);
    };
    const frame = requestAnimationFrame(sync);
    window.addEventListener("resize", sync); window.addEventListener("scroll", sync, true);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", sync); window.removeEventListener("scroll", sync, true); };
  }, [card.target]);

  const position = useMemo(() => {
    if (card.kind === "waiting") return { bottom: "1rem", left: "50%", transform: "translateX(-50%)" };
    if (!targetRect || typeof window === "undefined") return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    const width = window.innerWidth >= 768 ? 460 : 340;
    const left = clamp(targetRect.left + targetRect.width / 2 - width / 2, GAP, Math.max(GAP, window.innerWidth - width - GAP));
    const below = targetRect.top + targetRect.height + GAP;
    const top = below + 250 < window.innerHeight ? below : Math.max(GAP, targetRect.top - 250);
    return { top: `${top}px`, left: `${left}px`, transform: "none" };
  }, [card.kind, targetRect]);

  if (typeof document === "undefined") return null;
  const dismiss = onDismiss || onPause;
  return createPortal(<div className="pointer-events-none fixed inset-0 z-[170]" dir="rtl">
    {card.kind !== "waiting" ? <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-md" /> : null}
    <section className="pointer-events-auto fixed w-[calc(100vw-1.5rem)] max-w-[460px] rounded-[1.75rem] border border-slate-200/90 bg-white p-5 text-center text-slate-950 shadow-[0_30px_90px_rgba(15,23,42,0.32),0_8px_24px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:shadow-[0_30px_90px_rgba(0,0,0,0.55)]" style={position} role="dialog" aria-label={card.title}>
      <div className="relative flex items-center justify-center">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300">{card.kind === "lucky20" ? <Gift className="h-4 w-4" /> : <Route className="h-4 w-4" />}</span>
        <button type="button" onClick={dismiss} className="absolute right-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="إغلاق"> <X className="h-4 w-4" /> </button>
      </div>
      <p className="mt-2 text-[11px] font-black tracking-wide text-sky-700 dark:text-sky-300">Teachix</p>
      <h2 className="mt-1 text-lg font-black leading-7">{card.title}</h2>
      {card.description ? <p className="mx-auto mt-1.5 max-w-[390px] whitespace-pre-line text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">{card.description}</p> : null}
      {card.kind === "performance-select" ? <>
        <select value={selectedPerformanceSlug} onChange={(event) => onPerformanceSelect?.(event.target.value)} className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-sm font-bold text-slate-900 outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
          <option value="">اختر عنصر الأداء</option>
          {performanceServices.map((service) => <option key={service.slug} value={service.slug}>{service.title}</option>)}
        </select>
        <button type="button" disabled={busy || !selectedPerformanceSlug} onClick={onPrimary} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-black text-white hover:bg-sky-700 disabled:opacity-60">{card.primaryLabel}<Check className="h-4 w-4" /></button>
      </> : card.kind === "lucky20" && card.lucky20Reward ? <>
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-center dark:border-emerald-500/30 dark:bg-emerald-400/10"><p className="text-sm font-black text-emerald-700 dark:text-emerald-300">كود الخصم: 1500+</p><button type="button" onClick={() => { void navigator.clipboard?.writeText("1500+"); setCopied(true); }} className="mt-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white">نسخ الكود</button>{copied ? <p className="mt-2 text-[11px] font-black text-emerald-700 dark:text-emerald-300">تم النسخ ✓</p> : null}</div>
        <button type="button" onClick={onPrimary} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-black text-white hover:bg-sky-700">نكمل<Check className="h-4 w-4" /></button>
      </> : card.kind === "lucky20" ? <div className="mt-4 grid grid-cols-3 gap-2" dir="ltr">{[150, 700, 1500].map((answer) => <button key={answer} type="button" disabled={busy} onClick={() => onLuckyAnswer(answer)} className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 text-sm font-black text-slate-800 hover:border-sky-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">{answer === 1500 ? "1500+" : answer}</button>)}</div> : card.kind === "waiting" ? <button type="button" onClick={dismiss} className="mt-3 text-xs font-black text-slate-400 hover:text-slate-600">إخفاء</button> : <button type="button" disabled={busy} onClick={onPrimary} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-black text-white hover:bg-sky-700 disabled:opacity-60">{busy ? "لحظة..." : card.primaryLabel}<Check className="h-4 w-4" /></button>}
      {feedback ? <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-center text-xs font-black text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"><p>{feedback}</p>{card.kind === "lucky20" && feedback.includes("كود الخصم") ? <button type="button" onClick={() => void navigator.clipboard?.writeText("1500+")} className="mt-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-black text-white">كود الخصم: 1500+ · نسخ</button> : null}</div> : null}
      {card.secondaryLabel ? <button type="button" onClick={dismiss} className="mt-2 w-full text-center text-xs font-black text-slate-400 hover:text-slate-600">{card.secondaryLabel}</button> : null}
    </section>
  </div>, document.body);
}
