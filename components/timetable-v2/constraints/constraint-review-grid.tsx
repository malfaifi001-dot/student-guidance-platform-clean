"use client";

import {
  getConstraintDefinition,
  TONE_META,
} from "@/lib/timetable-v2/constraint-catalog";

import {
  slotKey,
  type ConstraintConflict,
} from "@/lib/timetable-v2/constraint-analysis";

import type {
  Constraint,
  DayItem,
  PeriodItem,
  Slot,
} from "./types";

type CellState = {
  total: number;
  tones: Record<string, number>;
  error: boolean;
  warning: boolean;
};

type Props = {
  days: DayItem[];
  periods: PeriodItem[];
  constraints: Constraint[];
  conflicts: ConstraintConflict[];
  onCellClick: (slot: Slot) => void;
};

export function ConstraintReviewGrid({
  days,
  periods,
  constraints,
  conflicts,
  onCellClick,
}: Props) {
  const conflictMap = new Map<
    string,
    { error: boolean; warning: boolean }
  >();

  for (const conflict of conflicts) {
    for (const slot of conflict.slots) {
      const key = slotKey(slot.dayId, slot.periodId);

      const current = conflictMap.get(key) ?? {
        error: false,
        warning: false,
      };

      if (conflict.severity === "ERROR") {
        current.error = true;
      } else {
        current.warning = true;
      }

      conflictMap.set(key, current);
    }
  }

  const cellState = (dayId: string, periodId: string): CellState => {
    const key = slotKey(dayId, periodId);

    const tones: Record<string, number> = {};

    let total = 0;

    for (const constraint of constraints) {
      if (!constraint.isActive) {
        continue;
      }

      const touches =
        constraint.slots.some(
          (slot) =>
            slot.dayId === dayId && slot.periodId === periodId,
        ) ||
        (constraint.days.some((day) => day.dayId === dayId) &&
          constraint.periods.some(
            (period) => period.periodId === periodId,
          ));

      if (!touches) {
        continue;
      }

      total += 1;

      const tone = getConstraintDefinition(constraint.type).tone;

      tones[tone] = (tones[tone] ?? 0) + 1;
    }

    const conflict = conflictMap.get(key);

    return {
      total,
      tones,
      error: conflict?.error ?? false,
      warning: conflict?.warning ?? false,
    };
  };

  const badgeOrder = ["danger", "fixed", "preferred", "fairness"] as const;

  return (
    <div className="overflow-auto rounded-2xl border border-slate-200">
      <table className="w-full min-w-[900px] border-collapse">
        <thead>
          <tr>
            <th className="sticky right-0 top-0 z-20 border-b border-l border-slate-200 bg-slate-950 px-4 py-3 text-right text-sm font-black text-white">
              الحصة
            </th>

            {days.map((day) => (
              <th
                key={day.id}
                className="sticky top-0 z-10 border-b border-l border-slate-200 bg-slate-950 px-4 py-3 text-center text-sm font-black text-white"
              >
                {day.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {periods.map((period) => (
            <tr key={period.id}>
              <td className="sticky right-0 z-10 border-b border-l border-slate-200 bg-white px-4 py-4">
                <div className="font-black">{period.label}</div>

                <div className="mt-1 text-[10px] text-slate-400">
                  {period.startTime ?? "—"}
                  {" - "}
                  {period.endTime ?? "—"}
                </div>
              </td>

              {days.map((day) => {
                const state = cellState(day.id, period.id);

                return (
                  <td
                    key={day.id}
                    className="border-b border-l border-slate-100 p-2"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        onCellClick({
                          dayId: day.id,
                          periodId: period.id,
                        })
                      }
                      className={[
                        "min-h-24 w-full rounded-xl border p-2.5 text-right transition",
                        state.error
                          ? "border-rose-400 bg-rose-50 ring-2 ring-rose-100 hover:ring-rose-200"
                          : state.warning
                            ? "border-amber-400 bg-amber-50 ring-2 ring-amber-100 hover:ring-amber-200"
                            : state.total > 0
                              ? "border-slate-200 bg-white hover:border-teal-400"
                              : "border-slate-200 bg-slate-50 hover:border-slate-300",
                      ].join(" ")}
                    >
                      {state.total === 0 ? (
                        <div className="flex h-full min-h-16 items-center justify-center text-xs font-bold text-slate-400">
                          لا توجد قيود
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-black text-slate-900">
                              {state.total} قيود
                            </span>

                            {state.error ? (
                              <span className="rounded-full bg-rose-600 px-1.5 py-0.5 text-[9px] font-black text-white">
                                تعارض
                              </span>
                            ) : state.warning ? (
                              <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-black text-white">
                                تعارض
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1">
                            {badgeOrder.map((tone) => {
                              const count = state.tones[tone];

                              if (!count) {
                                return null;
                              }

                              const meta = TONE_META[tone];

                              return (
                                <span
                                  key={tone}
                                  className={[
                                    "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black",
                                    meta.chip,
                                  ].join(" ")}
                                >
                                  <span
                                    className={[
                                      "h-1.5 w-1.5 rounded-full",
                                      meta.dot,
                                    ].join(" ")}
                                  />

                                  {meta.label} {count}
                                </span>
                              );
                            })}
                          </div>
                        </>
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
  );
}
