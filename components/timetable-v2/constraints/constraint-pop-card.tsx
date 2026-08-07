"use client";

import {
  getConstraintDefinition,
  TONE_META,
} from "@/lib/timetable-v2/constraint-catalog";

import type {
  ConstraintConflict,
} from "@/lib/timetable-v2/constraint-analysis";

import type {
  Constraint,
} from "./types";

type Props = {
  dayLabel: string;
  periodLabel: string;
  constraints: Constraint[];
  conflicts: ConstraintConflict[];
  busy: boolean;
  onClose: () => void;
  onEdit: (constraint: Constraint) => void;
  onToggleActive: (constraint: Constraint) => void;
  onDelete: (constraintId: string) => void;
  onCopy: (constraint: Constraint) => void;
};

const TONE_ORDER = [
  "danger",
  "fixed",
  "preferred",
  "fairness",
] as const;

export function ConstraintPopCard({
  dayLabel,
  periodLabel,
  constraints,
  conflicts,
  busy,
  onClose,
  onEdit,
  onToggleActive,
  onDelete,
  onCopy,
}: Props) {
  const active = constraints.filter((constraint) => constraint.isActive);

  const inactive = constraints.filter((constraint) => !constraint.isActive);

  const grouped = TONE_ORDER.map((tone) => ({
    tone,
    items: active.filter(
      (constraint) =>
        getConstraintDefinition(constraint.type).tone === tone,
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/25 p-3 backdrop-blur-sm md:items-center">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-[2rem] bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-black text-teal-700">
              تفاصيل الخلية
            </div>

            <h3 className="mt-2 text-xl font-black">
              {dayLabel}
              {" • "}
              {periodLabel}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg transition hover:bg-slate-200 disabled:opacity-50"
            aria-label="إغلاق"
          >
            ×
          </button>
        </div>

        {conflicts.length > 0 ? (
          <div className="mt-4 space-y-2">
            {conflicts.map((conflict, index) => (
              <div
                key={index}
                className={[
                  "rounded-2xl border p-3 text-xs leading-6",
                  conflict.severity === "ERROR"
                    ? "border-rose-200 bg-rose-50 text-rose-800"
                    : "border-amber-200 bg-amber-50 text-amber-800",
                ].join(" ")}
              >
                <div className="font-black">{conflict.title}</div>

                <div className="mt-1">{conflict.description}</div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex-1 space-y-3 overflow-y-auto">
          {grouped.length === 0 && inactive.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
              لا توجد قيود في هذه الخلية.
            </div>
          ) : null}

          {grouped.map((group) => (
            <div key={group.tone}>
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={[
                    "h-2 w-2 rounded-full",
                    TONE_META[group.tone].dot,
                  ].join(" ")}
                />

                <span className="text-xs font-black text-slate-500">
                  {TONE_META[group.tone].label} (
                  {group.items.length})
                </span>
              </div>

              <div className="space-y-2">
                {group.items.map((constraint) => {
                  const definition = getConstraintDefinition(constraint.type);

                  const targets = [
                    ...constraint.teachers.map((link) => link.teacher.name),
                    ...constraint.subjects.map((link) => link.subject.name),
                    ...constraint.classes.map((link) => link.class.name),
                  ];

                  return (
                    <div
                      key={constraint.id}
                      className={[
                        "rounded-2xl border p-4",
                        TONE_META[group.tone].cell,
                        TONE_META[group.tone].cellBorder,
                      ].join(" ")}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-black text-slate-900">
                            {definition.label}
                          </div>

                          <div className="mt-1 text-[11px] text-slate-500">
                            {constraint.strength === "HARD"
                              ? "إلزامي"
                              : "تفضيل"}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onEdit(constraint)}
                            className="rounded-lg border border-white bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                          >
                            تعديل
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onCopy(constraint)}
                            className="rounded-lg border border-white bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                          >
                            نسخ
                          </button>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onDelete(constraint.id)}
                            className="rounded-lg border border-white bg-white px-2.5 py-1.5 text-[11px] font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                          >
                            حذف
                          </button>
                        </div>
                      </div>

                      {targets.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {targets.map((name) => (
                            <span
                              key={name}
                              className="rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-slate-600"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {inactive.length > 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-4">
              <div className="text-[11px] font-black text-slate-400">
                قيود معطلة ({inactive.length})
              </div>

              <div className="mt-2 space-y-2">
                {inactive.map((constraint) => (
                  <div
                    key={constraint.id}
                    className="flex items-center justify-between gap-2 text-xs text-slate-500"
                  >
                    <span>
                      {getConstraintDefinition(constraint.type).label}
                    </span>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onToggleActive(constraint)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-teal-700 transition hover:bg-slate-100 disabled:opacity-50"
                    >
                      تفعيل
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="text-[11px] text-slate-400">
            {active.length} قيد نشط في هذه الخلية
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-11 rounded-xl border border-slate-200 bg-white px-6 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
