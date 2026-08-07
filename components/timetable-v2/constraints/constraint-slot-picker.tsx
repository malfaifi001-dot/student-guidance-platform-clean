"use client";

import {
  TONE_META,
} from "@/lib/timetable-v2/constraint-catalog";

import {
  slotKey,
} from "@/lib/timetable-v2/constraint-analysis";

import type {
  DayItem,
  PeriodItem,
  ToneHint,
} from "./types";

type Props = {
  days: DayItem[];
  periods: PeriodItem[];
  selectedSlots: Set<string>;
  onToggleSlot: (dayId: string, periodId: string) => void;
  onSelectDay: (dayId: string) => void;
  onSelectPeriod: (periodId: string) => void;
  onInvert: () => void;
  cellHint?: (dayId: string, periodId: string) => ToneHint;
};

export function ConstraintSlotPicker({
  days,
  periods,
  selectedSlots,
  onToggleSlot,
  onSelectDay,
  onSelectPeriod,
  onInvert,
  cellHint,
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-black text-slate-900">
            الخلايا المحددة
          </div>

          <div className="mt-0.5 text-[11px] text-slate-500">
            اضغط الخلايا مباشرة، أو استخدم أزرار التحديد السريع.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-black text-sky-700">
            {selectedSlots.size} خلية محددة
          </span>

          <button
            type="button"
            onClick={onInvert}
            disabled={selectedSlots.size === 0}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
          >
            عكس التحديد
          </button>
        </div>
      </div>

      <div className="mt-4 max-h-[420px] overflow-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr>
              <th className="sticky right-0 top-0 z-20 border-b border-l border-slate-200 bg-slate-950 px-3 py-2 text-right text-[11px] text-white">
                اليوم / الحصة
              </th>

              {periods.map((period) => (
                <th
                  key={period.id}
                  className="sticky top-0 z-10 border-b border-l border-slate-200 bg-slate-950 px-1 py-2 text-center"
                >
                  <button
                    type="button"
                    onClick={() => onSelectPeriod(period.id)}
                    className="w-full rounded-lg px-1 py-1 text-[11px] font-black text-white transition hover:bg-slate-800"
                    title="تحديد هذه الحصة في كل الأيام"
                  >
                    {period.label}
                  </button>

                  <div className="mt-0.5 text-[9px] font-normal text-slate-300">
                    {period.startTime ?? "—"}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {days.map((day) => (
              <tr key={day.id}>
                <td className="sticky right-0 z-10 border-b border-l border-slate-200 bg-white px-3 py-2">
                  <button
                    type="button"
                    onClick={() => onSelectDay(day.id)}
                    className="w-full rounded-lg px-1 py-1 text-right text-xs font-black text-slate-800 transition hover:bg-slate-100"
                    title="تحديد هذا اليوم كاملًا"
                  >
                    {day.label}
                  </button>
                </td>

                {periods.map((period) => {
                  const key = slotKey(day.id, period.id);

                  const selected = selectedSlots.has(key);

                  const hint = cellHint?.(day.id, period.id);

                  const tone = hint ? TONE_META[hint] : null;

                  return (
                    <td
                      key={period.id}
                      className="border-b border-l border-slate-100 p-1"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          onToggleSlot(day.id, period.id)
                        }
                        className={[
                          "flex h-12 w-full items-center justify-center rounded-lg border text-[11px] font-black transition",
                          selected
                            ? "border-sky-500 bg-sky-50 text-sky-700 ring-2 ring-sky-100"
                            : tone
                              ? [
                                  tone.cell,
                                  tone.cellBorder,
                                  tone.text,
                                ].join(" ")
                              : "border-slate-200 bg-white text-slate-400 hover:border-sky-300",
                        ].join(" ")}
                      >
                        {selected ? (
                          "محدد"
                        ) : tone ? (
                          <span className="flex items-center gap-1.5">
                            <span
                              className={[
                                "h-2 w-2 rounded-full",
                                tone.dot,
                              ].join(" ")}
                            />

                            {tone.label}
                          </span>
                        ) : (
                          "متاح"
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
