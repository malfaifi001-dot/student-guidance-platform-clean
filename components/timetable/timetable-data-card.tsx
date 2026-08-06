import type { ReactNode } from "react";

export type TimetableCardTone =
  | "sky"
  | "violet"
  | "amber"
  | "emerald"
  | "rose"
  | "slate";

const toneClasses: Record<
  TimetableCardTone,
  { card: string; icon: string; badge: string }
> = {
  sky: {
    card: "border-sky-200 bg-sky-50/35",
    icon: "bg-sky-100 text-sky-800",
    badge: "bg-sky-100 text-sky-800",
  },
  violet: {
    card: "border-violet-200 bg-violet-50/35",
    icon: "bg-violet-100 text-violet-800",
    badge: "bg-violet-100 text-violet-800",
  },
  amber: {
    card: "border-amber-200 bg-amber-50/35",
    icon: "bg-amber-100 text-amber-800",
    badge: "bg-amber-100 text-amber-800",
  },
  emerald: {
    card: "border-emerald-200 bg-emerald-50/35",
    icon: "bg-emerald-100 text-emerald-800",
    badge: "bg-emerald-100 text-emerald-800",
  },
  rose: {
    card: "border-rose-200 bg-rose-50/45",
    icon: "bg-rose-100 text-rose-800",
    badge: "bg-rose-100 text-rose-800",
  },
  slate: {
    card: "border-slate-200 bg-slate-50/70",
    icon: "bg-white text-slate-700 ring-1 ring-slate-200",
    badge: "bg-slate-100 text-slate-700",
  },
};

export type TimetableCardMetric = {
  label: string;
  value: ReactNode;
};

export function TimetableDataCard({
  icon,
  eyebrow,
  title,
  description,
  tone = "sky",
  badges = [],
  metrics = [],
  actions,
  children,
  className = "",
}: {
  icon: ReactNode;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  tone?: TimetableCardTone;
  badges?: ReactNode[];
  metrics?: TimetableCardMetric[];
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const classes = toneClasses[tone];

  return (
    <article
      className={`rounded-[1.75rem] border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${classes.card} ${className}`}
    >
      <div className="flex items-start gap-4">
        <div
          aria-hidden="true"
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${classes.icon}`}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="text-xs font-black text-slate-400">{eyebrow}</p>
          ) : null}
          <h3 className="mt-1 text-lg font-black leading-7 text-slate-950">
            {title}
          </h3>
          {description ? (
            <div className="mt-2 text-sm font-bold leading-6 text-slate-500">
              {description}
            </div>
          ) : null}
        </div>
      </div>

      {badges.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {badges.map((badge, index) => (
            <span
              key={index}
              className={`rounded-full px-2.5 py-1 text-xs font-black ${classes.badge}`}
            >
              {badge}
            </span>
          ))}
        </div>
      ) : null}

      {metrics.length ? (
        <div
          className={`mt-4 grid gap-3 ${
            metrics.length === 3 ? "grid-cols-3" : "grid-cols-2"
          }`}
        >
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-xl bg-white/80 p-3 ring-1 ring-slate-100">
              <p className="text-[11px] font-black text-slate-400">
                {metric.label}
              </p>
              <p className="mt-1 text-sm font-black text-slate-800">
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {children ? <div className="mt-4">{children}</div> : null}

      {actions ? (
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/70 pt-4">
          {actions}
        </div>
      ) : null}
    </article>
  );
}

export function TimetableEmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-52 place-items-center rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <div>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-slate-400 ring-1 ring-slate-100">
          {icon}
        </div>
        <h3 className="mt-4 text-xl font-black text-slate-800">{title}</h3>
        <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}
