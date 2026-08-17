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
  disabledSections?: MobileShellSection[];
  onUnavailable?: () => void;
};

type NavItem = {
  id: MobileShellSection;
  label: string;
  href: string;
  icon: MobileIconName;
};

const navItems: NavItem[] = [
  { id: "home", label: "الرئيسية", href: "/mobile/counselor", icon: "home" },
  { id: "cases", label: "الحالات", href: "/mobile/counselor/cases", icon: "check" },
  { id: "reports", label: "التقارير", href: "/mobile/counselor/reports", icon: "file" },
  { id: "assessment-center", label: "التحليل", href: "/mobile/counselor/assessment-center", icon: "chart" },
  { id: "services", label: "المزيد", href: "/mobile/counselor/services", icon: "grid" },
];

function AppLogo() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-[1.15rem] bg-sky-600 text-xl font-black tracking-tight text-white shadow-[0_8px_20px_rgba(2,132,199,0.20)] ring-1 ring-white/70 dark:bg-sky-500 dark:shadow-sky-950/30">
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

function BottomNavigation({
  activeSection,
  disabledSections = [],
  onUnavailable,
}: {
  activeSection: MobileShellSection;
  disabledSections?: MobileShellSection[];
  onUnavailable?: () => void;
}) {
  return (
    <nav className="fixed inset-x-0 z-40 mx-auto w-[calc(100%-2rem)] max-w-[390px] rounded-[2rem] bg-white/94 p-2 shadow-[0_12px_28px_rgba(15,23,42,0.10)] ring-1 ring-slate-100 backdrop-blur-2xl dark:bg-slate-900/90 dark:shadow-slate-950/50 dark:ring-white/10" style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
      <div className="grid grid-cols-5 gap-1">
        {navItems.map((item) => {
          const active = activeSection === item.id;
          const disabled = disabledSections.includes(item.id);

          return disabled ? (
            <button
              key={item.id}
              type="button"
              onClick={onUnavailable}
              className={["relative flex h-[4.35rem] flex-col items-center justify-center gap-1 rounded-[1.55rem] text-[11px] font-black transition active:scale-[0.98]", "text-slate-400 dark:text-slate-500"].join(" ")}
              aria-label={item.label}
            >
              <MobileIcon name={item.icon} className="h-5 w-5 text-slate-400 dark:text-slate-500" />
              <span>{item.label}</span>
            </button>
          ) : (
            <Link
              key={item.id}
              href={item.href}
              className={[
                "relative flex h-[4.35rem] flex-col items-center justify-center gap-1 rounded-[1.55rem] text-[11px] font-black transition active:scale-[0.98]",
                active
                  ? "text-slate-600 dark:text-slate-300"
                  : "text-slate-500 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5",
              ].join(" ")}
            >
              <MobileIcon
                name={item.icon}
                className={[
                  "h-5 w-5 transition",
                  active ? "text-sky-700 dark:text-sky-300" : "text-slate-500 dark:text-slate-300",
                ].join(" ")}
              />
              <span>{item.label}</span>

              {active ? (
                <span className="absolute bottom-1.5 h-1 w-8 rounded-full bg-sky-300/80 dark:bg-sky-300/70" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function MobileAppShell({ activeSection, children, disabledSections, onUnavailable }: MobileAppShellProps) {
  return (
    <div
      dir="rtl"
      className="min-h-[100dvh] bg-[#cbd7e3] text-slate-950 dark:bg-slate-950 dark:text-slate-50"
    >
<div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-[#e8f0f7] dark:bg-slate-950">
        <header className="relative z-20 flex shrink-0 items-center justify-between px-7 pb-5 pt-7">
          <NotificationButton />
          <AppLogo />
        </header>

        <main className="relative z-10 flex-1 overflow-y-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}>
          {children}
        </main>

        <BottomNavigation activeSection={activeSection} disabledSections={disabledSections} onUnavailable={onUnavailable} />
      </div>
    </div>
  );
}
