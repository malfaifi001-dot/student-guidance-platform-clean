"use client";

import Link from "next/link";
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  ClipboardCheck,
  FileCheck2,
  Medal,
  School,
  ListChecks,
  UploadCloud,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";

import type {
  WorkspaceModule,
  WorkspaceModuleIcon,
} from "@/lib/workspace/workspace-modules";

const iconByName: Record<WorkspaceModuleIcon, typeof ClipboardList> = {
  workflow: UsersRound,
  assignments: ClipboardCheck,
  evidence: UploadCloud,
  surveys: ListChecks,
  reports: FileCheck2,
  students: UsersRound,
  assessment: BarChart3,
  certificates: Medal,
  portfolio: BriefcaseBusiness,
  subscription: WalletCards,
  account: UserRound,
  schoolSettings: School,
  calendar: CalendarDays,
};

function chunkModules(modules: WorkspaceModule[]) {
  return Array.from(
    { length: Math.ceil(modules.length / 4) },
    (_, index) => modules.slice(index * 4, index * 4 + 4),
  );
}

export function MobileWorkspaceModuleCarousel({
  modules,
}: {
  modules: WorkspaceModule[];
}) {
  const pages = chunkModules(modules);

  return (
    <div className="relative overflow-hidden" dir="rtl">
      <div className="flex snap-x snap-mandatory overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {pages.map((page, pageIndex) => {
          const columns = [page.slice(0, 2), page.slice(2, 4)];

          return (
            <div
              key={`mobile-workspace-page-${pageIndex}`}
              className="grid min-w-full shrink-0 snap-start grid-cols-2 gap-2.5 px-1"
            >
              {columns.map((column, columnIndex) => (
                <div
                  key={`mobile-workspace-column-${pageIndex}-${columnIndex}`}
                  className="space-y-2.5"
                >
                  {column.map((module) => {
                    const Icon = iconByName[module.icon];
                    const card = (
                      <article className="flex min-h-[4.4rem] items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-right shadow-sm transition active:scale-[0.99] dark:border-slate-700 dark:bg-slate-800">
                        <h3 className="min-w-0 text-sm font-black leading-5 text-slate-800 dark:text-slate-100">
                          {module.title}
                        </h3>
                        <Icon className="h-4 w-4 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden="true" />
                      </article>
                    );

                    return module.status === "soon" ? (
                      <div key={module.title} className="opacity-70">
                        {card}
                      </div>
                    ) : (
                      <Link key={module.title} href={module.href}>
                        {card}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
