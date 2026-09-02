"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, FileCheck2, FolderKanban, Home, Search } from "lucide-react";
import { WorkflowSearchTrigger } from "@/components/workflow-search/workflow-search-trigger";

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
  search?: boolean;
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
    { label: "\u0627\u0644\u0628\u062d\u062b", href: "#workflow-search", icon: Search, search: true },
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
      data-mobile-bottom-nav="true"
      className={`fixed left-1/2 bottom-0 ${MOBILE_LAYER_Z_INDEX.navigation} h-16 w-[calc(100%-44px)] max-w-[420px] -translate-x-1/2 rounded-[32px] bg-white shadow-[0_8px_28px_rgba(15,23,42,0.08)] dark:bg-[#102138] dark:shadow-[0_8px_28px_rgba(2,6,23,0.32)] md:hidden ${role === "TEACHER" ? "overflow-visible" : "overflow-hidden"}`}
      style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <div className={`grid h-16 w-full ${role === "TEACHER" ? "grid-cols-5" : "grid-cols-4"}`}>
        {items.map((item) => {
          if (item.search) {
            return <div key={item.href} className="flex h-16 min-w-0 flex-col items-center justify-start text-center"><WorkflowSearchTrigger mobile /></div>;
          }
          const active = isActivePath(pathname, item);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex h-16 min-w-0 flex-col items-center justify-center gap-1 px-1 text-center text-[12px] leading-4 transition focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-600 ${
                active
                  ? "font-semibold text-sky-600"
                  : "font-normal text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
            >
              <span className="grid h-6 w-6 place-items-center" aria-hidden="true">
                <Icon className="h-6 w-6" strokeWidth={active ? 2 : 1.75} />
              </span>
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
