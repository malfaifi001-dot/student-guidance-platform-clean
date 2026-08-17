"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, FileCheck2, FolderKanban, Home } from "lucide-react";

import { OFFICIAL_WORKSPACE_ROUTES } from "@/lib/workspace/workspace-modules";
import { MOBILE_LAYER_Z_INDEX } from "@/components/mobile-app/mobile-layer-contract";

type DashboardMobileBottomNavProps = {
  role?: string | null;
};

type MobileNavItem = {
  label: string;
  href: string;
  icon: typeof Home;
  isHome?: boolean;
};

const roleNavigation: Record<string, MobileNavItem[]> = {
  COUNSELOR: [
    { label: "الرئيسية", href: OFFICIAL_WORKSPACE_ROUTES.counselorHome, icon: Home, isHome: true },
    { label: "الحالات", href: OFFICIAL_WORKSPACE_ROUTES.cases, icon: FolderKanban },
    { label: "التقارير", href: OFFICIAL_WORKSPACE_ROUTES.reports, icon: FileCheck2 },
    { label: "ملف الإنجاز", href: "/dashboard/portfolio", icon: BriefcaseBusiness },
  ],
  ACTIVITY_LEADER: [
    { label: "الرئيسية", href: OFFICIAL_WORKSPACE_ROUTES.activityLeaderHome, icon: Home, isHome: true },
    { label: "الحالات", href: OFFICIAL_WORKSPACE_ROUTES.cases, icon: FolderKanban },
    { label: "التقارير", href: OFFICIAL_WORKSPACE_ROUTES.reports, icon: FileCheck2 },
    { label: "ملف الإنجاز", href: "/dashboard/activity-leader/portfolio", icon: BriefcaseBusiness },
  ],
  TEACHER: [
    { label: "الرئيسية", href: OFFICIAL_WORKSPACE_ROUTES.teacherHome, icon: Home, isHome: true },
    { label: "الحالات", href: OFFICIAL_WORKSPACE_ROUTES.cases, icon: FolderKanban },
    { label: "التقارير", href: OFFICIAL_WORKSPACE_ROUTES.reports, icon: FileCheck2 },
    { label: "ملف الإنجاز", href: "/dashboard/teacher/portfolio", icon: BriefcaseBusiness },
  ],
};

function isActivePath(pathname: string, item: MobileNavItem) {
  if (item.isHome) return pathname === item.href;

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function DashboardMobileBottomNav({ role }: DashboardMobileBottomNavProps) {
  const pathname = usePathname();
  const items = role ? roleNavigation[role] : undefined;

  if (!items) return null;

  return (
    <nav
      aria-label="التنقل الرئيسي للهاتف"
      className={`fixed inset-x-3 bottom-3 ${MOBILE_LAYER_Z_INDEX.navigation} mx-auto max-w-md rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/90 dark:shadow-[0_12px_30px_rgba(2,6,23,0.4)] md:hidden`}
      style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto grid min-h-16 w-full grid-cols-4 gap-1 px-0.5">
        {items.map((item) => {
          const active = isActivePath(pathname, item);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-center text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3478B8] ${
                active
                  ? "bg-sky-50 text-[#3478B8] dark:bg-sky-950/70 dark:text-sky-300"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              }`}
            >
              <span className={`grid h-7 w-7 place-items-center rounded-xl ${active ? "bg-sky-100 dark:bg-sky-900/80" : "bg-transparent"}`} aria-hidden="true">
                <Icon className="h-5 w-5" />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
