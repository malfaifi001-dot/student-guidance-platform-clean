"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";

import { buildTeachixSupportWhatsAppUrl } from "@/lib/marketing/contact-details";

const SUPPORT_PARKED_STORAGE_KEY = "teachix-support-whatsapp-parked";

export function FloatingWhatsAppSupport() {
  const [visible, setVisible] = useState(false);
  const [parked, setParked] = useState(false);

  useEffect(() => {
    const preferenceTimer = window.setTimeout(() => {
      setParked(window.localStorage.getItem(SUPPORT_PARKED_STORAGE_KEY) === "true");
    }, 0);
    const timer = window.setTimeout(() => setVisible(true), 700);
    return () => {
      window.clearTimeout(preferenceTimer);
      window.clearTimeout(timer);
    };
  }, []);

  function toggleParked(next: boolean) {
    setParked(next);
    window.localStorage.setItem(SUPPORT_PARKED_STORAGE_KEY, String(next));
  }

  return (
    <div
      className={[
        "pointer-events-none fixed bottom-[calc(var(--mobile-bottom-clearance))] left-4 z-30 overflow-visible transition-all duration-500 md:bottom-6 md:left-6",
        "motion-reduce:transform-none motion-reduce:transition-none",
        parked ? "-translate-x-[calc(100%-1rem)]" : "translate-x-0",
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
      ].join(" ")}
      dir="rtl"
    >
      {parked ? (
        <button
          type="button"
          onClick={() => toggleParked(false)}
          title="إظهار زر الدعم"
          aria-label="إظهار زر الدعم"
          className="pointer-events-auto absolute inset-y-0 right-0 grid w-4 place-items-center rounded-r-full bg-emerald-600/90 text-white shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 dark:bg-emerald-500/80"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : (
        <>
          <span className="absolute -top-8 right-0 z-10 whitespace-nowrap rounded-full border border-emerald-100 bg-white/95 px-2.5 py-1 text-[11px] font-black text-emerald-700 shadow-sm backdrop-blur dark:border-emerald-400/20 dark:bg-slate-900/95 dark:text-emerald-300">
            راسلنا
          </span>

          <button
            type="button"
            onClick={() => toggleParked(true)}
            title="إخفاء زر الدعم"
            aria-label="إخفاء زر الدعم"
            className="pointer-events-auto absolute -right-2 top-0 z-20 grid h-6 w-6 place-items-center rounded-full border border-white/80 bg-white/95 text-slate-500 shadow-sm transition hover:text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-300 dark:hover:text-white"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <a
            href={buildTeachixSupportWhatsAppUrl()}
            target="_blank"
            rel="noreferrer"
            title="التواصل مع خدمة العملاء عبر واتساب"
            aria-label="التواصل مع خدمة العملاء عبر واتساب"
            className="pointer-events-auto grid h-14 w-14 place-items-center rounded-full border border-white/60 bg-emerald-600/90 text-white shadow-[0_10px_28px_rgba(16,185,129,0.25)] backdrop-blur transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 dark:border-emerald-200/20 dark:bg-emerald-500/80 dark:hover:bg-emerald-500"
          >
            <MessageCircle className="h-6 w-6" strokeWidth={2.25} aria-hidden="true" />
          </a>
        </>
      )}
    </div>
  );
}
