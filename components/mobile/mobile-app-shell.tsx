"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { MobileIcon, type MobileIconName } from "@/components/mobile/mobile-icons";

export type MobileShellSection =
  | "home"
  | "cases"
  | "reports"
  | "students-upload"
  | "surveys"
  | "assessment-center"
  | "services";

type MobileAppShellProps = {
  activeSection: MobileShellSection;
  children: ReactNode;
};

type NavItem = {
  id: MobileShellSection;
  label: string;
  href: string;
  icon: MobileIconName;
};

const navItems: NavItem[] = [
  {
    id: "home",
    label: "الرئيسية",
    href: "/mobile/counselor",
    icon: "home",
  },
  {
    id: "cases",
    label: "الحالات",
    href: "/mobile/counselor/cases",
    icon: "check",
  },
  {
    id: "reports",
    label: "التقارير",
    href: "/mobile/counselor/reports",
    icon: "file",
  },
  {
    id: "assessment-center",
    label: "التحليل",
    href: "/mobile/counselor/assessment-center",
    icon: "chart",
  },
  {
    id: "services",
    label: "المزيد",
    href: "/mobile/counselor/services",
    icon: "grid",
  },
];

function AppLogo() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-[1.15rem] bg-sky-600 text-xl font-black tracking-tight text-white shadow-md shadow-sky-200 ring-1 ring-white/70 dark:bg-sky-500 dark:shadow-sky-950/30">
      ST
    </div>
  );
}

function NotificationButton() {
  return (
    <button
      type="button"
      className="relative flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-slate-500 transition active:scale-[0.98] dark:text-slate-200"
      aria-label="الإشعارات"
    >
      <MobileIcon name="bell" className="h-5 w-5" />
      <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
    </button>
  );
}

function BottomNavigation({ activeSection }: { activeSection: MobileShellSection }) {
  return (
    <nav className="absolute inset-x-5 bottom-5 z-20 rounded-[2rem] bg-white/86 p-2 shadow-xl shadow-sky-100/80 ring-1 ring-white/95 backdrop-blur-2xl dark:bg-slate-900/86 dark:shadow-slate-950/50 dark:ring-white/10">
      <div className="grid grid-cols-5 gap-1">
        {navItems.map((item) => {
          const active = activeSection === item.id;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={[
                "relative flex h-[4.35rem] flex-col items-center justify-center gap-1 rounded-[1.55rem] text-[11px] font-black transition active:scale-[0.98]",
                active
                  ? "bg-sky-50 text-sky-700 ring-1 ring-sky-100 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-400/20"
                  : "text-slate-500 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5",
              ].join(" ")}
            >
              <MobileIcon name={item.icon} className="h-5 w-5" />
              <span>{item.label}</span>

              {active ? (
                <span className="absolute bottom-1.5 h-1 w-9 rounded-full bg-sky-400 dark:bg-sky-300" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function MobileAppShell({ activeSection, children }: MobileAppShellProps) {
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#e8f0f7] p-2 text-slate-950 dark:bg-slate-950 dark:text-slate-50 sm:p-6"
    >
      <div className="relative mx-auto flex h-[calc(100vh-1rem)] max-h-[940px] min-h-[720px] w-full max-w-[430px] flex-col overflow-hidden rounded-[3rem] border border-white/80 bg-[radial-gradient(circle_at_top_left,rgba(186,230,253,0.58),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.90),rgba(239,246,255,0.88))] shadow-2xl shadow-slate-300/70 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))] dark:shadow-slate-950/80"
      >
        <header className="relative z-20 flex shrink-0 items-center justify-between px-7 pb-5 pt-7">
          <NotificationButton />
          <AppLogo />
        </header>

        <main className="relative z-10 flex-1 overflow-y-auto px-5 pb-28 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {children}
        </main>

        <BottomNavigation activeSection={activeSection} />
      </div>
    </div>
  );
}