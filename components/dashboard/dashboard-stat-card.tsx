import Link from "next/link";
import type { ReactNode } from "react";

export type DashboardStat = {
  label: string;
  value: string;
  icon?: ReactNode;
  href?: string;
};

export function DashboardStatCard({ stat }: { stat: DashboardStat }) {
  const content = (
    <article className="flex min-w-[9.5rem] flex-1 items-center gap-2 rounded-xl border border-[#D7E6EF] bg-[#F8FBFD] px-3 py-2 shadow-sm transition hover:border-sky-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      {stat.icon ? (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF4FA] text-[#0F7FA8] dark:bg-sky-950/50 dark:text-sky-300">
          {stat.icon}
        </span>
      ) : null}
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-bold text-slate-500 dark:text-slate-400">
          {stat.label}
        </span>
        <strong className="block text-lg font-black text-[#123B52] dark:text-white">
          {stat.value}
        </strong>
      </span>
    </article>
  );

  return stat.href ? (
    <Link href={stat.href} className="flex min-w-0 flex-1 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
      {content}
    </Link>
  ) : (
    content
  );
}
