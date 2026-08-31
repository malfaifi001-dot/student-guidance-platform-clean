import type { ReactNode } from "react";

export type DashboardContextItem = {
  label: string;
  value: string;
  icon?: ReactNode;
};

type DashboardContextCardProps = {
  title: string;
  items: DashboardContextItem[];
};

export function DashboardContextCard({
  title,
  items,
}: DashboardContextCardProps) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-sky-100 bg-[#F8FBFD] px-4 py-3 shadow-sm dark:border-sky-900/60 dark:bg-slate-900">
      <h2 className="text-sm font-black text-[#0F5F7A] dark:text-sky-300">
        {title}
      </h2>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={`${item.label}-${item.value}`}
            className="flex min-w-0 items-center gap-2 rounded-xl border border-sky-100 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950"
          >
            {item.icon ? (
              <span className="text-[#0F7FA8] dark:text-sky-300">{item.icon}</span>
            ) : null}
            <span className="min-w-0 truncate text-xs font-bold text-slate-500 dark:text-slate-400">
              {item.label}
            </span>
            <strong className="min-w-0 truncate text-xs font-black text-slate-900 dark:text-white">
              {item.value}
            </strong>
          </div>
        ))}
      </div>
    </section>
  );
}
