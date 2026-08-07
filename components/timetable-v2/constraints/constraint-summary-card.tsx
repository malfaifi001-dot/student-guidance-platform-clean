"use client";

import {
  getConstraintDefinition,
  TONE_META,
} from "@/lib/timetable-v2/constraint-catalog";

import type {
  ClassItem,
  Constraint,
  DayItem,
  PeriodItem,
} from "./types";

type Props = {
  constraint: Constraint;
  days: DayItem[];
  periods: PeriodItem[];
  editing: boolean;
  busy: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  onCopy: () => void;
};

export function ConstraintSummaryCard({
  constraint,
  days,
  periods,
  editing,
  busy,
  onEdit,
  onToggleActive,
  onDelete,
  onCopy,
}: Props) {
  const definition = getConstraintDefinition(constraint.type);

  const tone = TONE_META[definition.tone];

  const teachingPeriods = periods
    .filter((period) => !period.isBreak)
    .sort((a, b) => a.order - b.order);

  const slotCount = constraint.slots.length;

  const dayCount = constraint.days.length;

  const periodCount = constraint.periods.length;

  const targetNames = [
    ...constraint.teachers.map((link) => link.teacher.name),
    ...constraint.subjects.map((link) => link.subject.name),
    ...constraint.classes.map((link) => link.class.name),
  ];

  return (
    <div
      className={[
        "rounded-2xl border p-4 transition",
        !constraint.isActive
          ? "border-slate-200 bg-slate-50 opacity-60"
          : editing
            ? "border-violet-300 bg-violet-50/60 ring-2 ring-violet-100"
            : "border-slate-200 bg-white",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={[
              "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
              tone.dot,
            ].join(" ")}
          />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-black text-slate-900">
                {definition.label}
              </span>

              <span
                className={[
                  "rounded-full px-2 py-0.5 text-[10px] font-black",
                  tone.chip,
                ].join(" ")}
              >
                {tone.label}
              </span>

              <span
                className={[
                  "rounded-full px-2 py-0.5 text-[10px] font-black",
                  constraint.strength === "HARD"
                    ? "bg-slate-950 text-white"
                    : "bg-teal-100 text-teal-700",
                ].join(" ")}
              >
                {constraint.strength === "HARD"
                  ? "إلزامي"
                  : "تفضيل"}
              </span>

              {!constraint.isActive ? (
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black text-slate-500">
                  معطل
                </span>
              ) : null}
            </div>

            <div className="mt-1 text-[11px] leading-5 text-slate-500">
              {definition.description}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onToggleActive}
            className={[
              "rounded-lg border px-3 py-1.5 text-[11px] font-black transition disabled:opacity-50",
              constraint.isActive
                ? "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                : "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100",
            ].join(" ")}
          >
            {constraint.isActive ? "تعطيل" : "تفعيل"}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={onEdit}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            تعديل
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={onCopy}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            نسخ
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
          >
            حذف
          </button>
        </div>
      </div>

      {targetNames.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {targetNames.map((name) => (
            <span
              key={name}
              className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600"
            >
              {name}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-bold text-slate-500">
        {typeof constraint.valueInt === "number" &&
        constraint.valueInt !== null ? (
          <span className="rounded-lg bg-amber-50 px-2 py-1 text-amber-700">
            القيمة: {constraint.valueInt}
          </span>
        ) : null}

        {constraint.slots.length > 0 ? (
          <span>
            {slotCount} خلية محددة
          </span>
        ) : null}

        {dayCount > 0 ? (
          <span>
            {dayCount} يوم{" "}
            {days
              .filter((day) =>
                constraint.days.some((link) => link.dayId === day.id),
              )
              .map((day) => day.label)
              .join("، ")}
          </span>
        ) : null}

        {periodCount > 0 ? (
          <span>
            {periodCount} حصة{" "}
            {teachingPeriods
              .filter((period) =>
                constraint.periods.some(
                  (link) => link.periodId === period.id,
                ),
              )
              .map((period) => period.label)
              .join("، ")}
          </span>
        ) : null}
      </div>
    </div>
  );
}
