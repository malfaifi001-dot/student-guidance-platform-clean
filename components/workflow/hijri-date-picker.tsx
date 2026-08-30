"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatHijriDate,
  gregorianToHijri,
  hijriMonthDays,
  hijriToGregorian,
  type HijriDate,
} from "@/lib/workflow-values/hijri-date";

const months = ["محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"];

export function HijriDatePicker({ value, onChange, className }: { value: string; onChange: (value: string) => void; className: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const selected = gregorianToHijri(value);
  const today = gregorianToHijri(new Date().toISOString().slice(0, 10)) || { day: 1, month: 1, year: 1447 };
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<HijriDate>(selected || today);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (selected) setView(selected);
  }, [value]);

  const days = useMemo(() => {
    const first = hijriToGregorian({ year: view.year, month: view.month, day: 1 });
    const offset = first ? new Date(`${first}T00:00:00Z`).getUTCDay() : 0;
    return Array.from({ length: offset + hijriMonthDays(view.year, view.month) }, (_, index) =>
      index < offset ? null : index - offset + 1,
    );
  }, [view]);

  function moveMonth(delta: number) {
    const index = view.year * 12 + view.month - 1 + delta;
    setView({ year: Math.floor(index / 12), month: (index % 12) + 1, day: 1 });
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" className={className} onClick={() => setOpen((current) => !current)} aria-label="اختيار التاريخ الهجري">
        <CalendarDays className="h-4 w-4 shrink-0 text-sky-600" />
        <span>{formatHijriDate(value) || "اختر التاريخ الهجري"}</span>
      </button>
      {open ? (
        <div className="absolute z-50 mt-2 w-[min( nineteenrem,calc(100vw-2rem))] min-w-[19rem] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl" dir="rtl">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={() => moveMonth(1)} aria-label="الشهر التالي"><ChevronRight className="h-5 w-5" /></button>
            <strong>{months[view.month - 1]} {view.year}</strong>
            <button type="button" onClick={() => moveMonth(-1)} aria-label="الشهر السابق"><ChevronLeft className="h-5 w-5" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400">
            {["أح", "إث", "ث", "أر", "خ", "ج", "س"].map((day) => <span key={day}>{day}</span>)}
            {days.map((day, index) => day ? (
              <button key={day} type="button" className={`rounded-lg py-2 text-sm ${selected?.day === day && selected.month === view.month && selected.year === view.year ? "bg-sky-600 text-white" : "text-slate-700 hover:bg-sky-50"}`} onClick={() => { const next = hijriToGregorian({ year: view.year, month: view.month, day }); if (next) onChange(next); setOpen(false); }}>{day}</button>
            ) : <span key={`empty-${index}`} />)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
