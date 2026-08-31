import Link from "next/link";
import type { ReactNode } from "react";

export type DashboardService = {
  title: string;
  href: string;
  icon: ReactNode;
  status?: "available" | "soon";
};

export function DashboardServiceGrid({
  services,
}: {
  services: DashboardService[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {services.map((service) => {
        const card = (
          <article
            className={[
              "flex min-h-24 items-center gap-3 rounded-xl border px-4 py-3 transition",
              service.status === "soon"
                ? "border-slate-200 bg-slate-50 opacity-70 dark:border-slate-800 dark:bg-slate-900"
                : "border-slate-200 bg-slate-50/70 hover:border-sky-200 hover:bg-white hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-sky-800 dark:hover:bg-slate-900",
            ].join(" ")}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sky-700 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-sky-300 dark:ring-slate-700">
              {service.icon}
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-black text-slate-900 dark:text-white">
                {service.title}
              </h3>
              {service.status === "soon" ? (
                <span className="mt-1 inline-block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  قريبًا
                </span>
              ) : null}
            </div>
          </article>
        );

        return service.status === "soon" ? (
          <div key={service.title}>{card}</div>
        ) : (
          <Link key={service.title} href={service.href}>
            {card}
          </Link>
        );
      })}
    </div>
  );
}
