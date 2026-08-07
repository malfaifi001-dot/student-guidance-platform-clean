"use client";

import type {
  ReadinessGroup,
} from "@/lib/timetable-v2/readiness-groups";

export function ReadinessBlockersSummary({
  blockers,
  onSelect,
}: {
  blockers: ReadinessGroup[];
  onSelect: (code: string) => void;
}) {
  if (blockers.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">
        ما الذي ينقص للوصول إلى الجاهزية؟
      </h2>

      <p className="mt-1 text-xs leading-6 text-slate-500">
        أبرز العوائق المتبقية؛ اضغط أي عنصر للانتقال إلى تفاصيله.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {blockers.map((group) => (
          <button
            key={group.code}
            type="button"
            onClick={() => onSelect(group.code)}
            className={[
              "flex items-center gap-3 rounded-2xl border p-4 text-right transition hover:shadow-sm",
              group.severity === "ERROR"
                ? "border-rose-200 bg-rose-50 hover:border-rose-300"
                : "border-amber-200 bg-amber-50 hover:border-amber-300",
            ].join(" ")}
          >
            <span
              className={[
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black text-white",
                group.severity === "ERROR"
                  ? "bg-rose-600"
                  : "bg-amber-500",
              ].join(" ")}
            >
              {group.count}
            </span>

            <span
              className={[
                "min-w-0 flex-1 text-xs font-black leading-5",
                group.severity === "ERROR"
                  ? "text-rose-900"
                  : "text-amber-900",
              ].join(" ")}
            >
              {group.blockerPhrase}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
