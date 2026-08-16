"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { ThemeToggleButton } from "@/components/theme/theme-toggle-button";
import { GuidanceLauncher } from "@/components/guidance/guidance-launcher";
import { GuidanceVideosLauncher } from "@/components/guidance-videos/guidance-videos-launcher";
import { ANALYTICS_EVENTS } from "@/lib/analytics/analytics-events";
import {
  clearAnalyticsUserIdentity,
  trackAnalyticsEvent,
} from "@/lib/analytics/analytics-client";
import {
  ChevronDown,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
} from "lucide-react";

type DashboardHeaderProps = {
  user?: {
    id?: string | null;
    name?: string | null;
    officialName?: string | null;
    gender?: string | null;
    jobTitle?: string | null;
    role?: string | null;
    schoolAccount?: {
      name?: string | null;
      profile?: {
        schoolName?: string | null;
        logoUrl?: string | null;
      } | null;
    } | null;
  } | null;
  subscription?: {
    planName: string;
    statusText: string;
  };
};

export function DashboardHeader({ user, subscription }: DashboardHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [sidebarOpen]);

  const isAdmin =
    user?.role === "ADMIN" || pathname.startsWith("/dashboard/admin");

  const isActivityLeader =
    user?.role === "ACTIVITY_LEADER" ||
    pathname.startsWith("/dashboard/activity-leader");

  const isTeacher =
    user?.role === "TEACHER" || pathname.startsWith("/dashboard/teacher");

  const isPrincipal =
    user?.role === "PRINCIPAL" || pathname.startsWith("/dashboard/principal");

  const displayName = user?.officialName || user?.name || "حسابي";

  const avatar =
    user?.schoolAccount?.profile?.logoUrl ||
    (user?.gender === "FEMALE"
      ? "/uploads/VD/girl.png"
      : "/uploads/VD/boy.png");

  const roleText = isAdmin
    ? "مدير النظام"
    : isPrincipal
      ? user?.gender === "FEMALE" ? "مديرة المدرسة" : "مدير المدرسة"
      : user?.jobTitle ||
      (isActivityLeader
        ? user?.gender === "FEMALE"
          ? "رائدة النشاط"
          : "رائد النشاط"
        : isTeacher
          ? user?.gender === "FEMALE"
            ? "معلمة"
            : "معلم"
          : user?.gender === "FEMALE"
            ? "موجهة طلابية"
            : "موجه طلابي");

  const searchPlaceholder = isAdmin
    ? "ابحث عن حساب، باقة، طلب تفعيل، Workflow..."
    : isActivityLeader
      ? "ابحث عن برنامج، فعالية، مشاركة أو تقرير نشاط..."
      : isTeacher
        ? "ابحث في مساحة المعلم..."
        : isPrincipal
          ? "ابحث في مساحة مدير المدرسة..."
        : "ابحث عن طالب، خدمة، حالة أو تقرير...";

  const headerBadgeText = isAdmin
    ? "Admin Center"
    : isActivityLeader
      ? ""
      : isTeacher
        ? "مساحة المعلم"
        : isPrincipal
          ? "وضع مدير المدرسة"
        : "";

  async function logout() {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
    });

    if (response.ok) {
      trackAnalyticsEvent(ANALYTICS_EVENTS.LOGOUT);
      clearAnalyticsUserIdentity();
    }
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-[#f7faff]/85 px-2 py-2.5 backdrop-blur-xl sm:px-3 md:px-4 dark:border-slate-800 dark:bg-[#070b18]/88">
      <div className="mx-auto flex min-w-0 max-w-[1680px] items-center justify-between gap-2 md:gap-4">
        <div className="hidden min-w-[360px] max-w-2xl flex-1 lg:block">
          <div className="relative">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              suppressHydrationWarning
              type="search"
              placeholder={searchPlaceholder}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-12 text-[15px] font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-200 focus:ring-4 focus:ring-sky-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-500/50 dark:focus:ring-sky-500/10"
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2 lg:flex-none">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-sky-600 md:hidden dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
            aria-label="فتح قائمة لوحة التحكم"
            aria-expanded={sidebarOpen}
            aria-controls="dashboard-mobile-sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          {headerBadgeText ? (
            <div
              className={[
                "hidden items-center gap-2 rounded-2xl border bg-white px-4 py-2 text-[13px] font-black shadow-sm md:flex dark:border-slate-800 dark:bg-slate-950",
                isAdmin
                  ? "border-slate-200 text-slate-700 dark:text-slate-200"
                  : "border-slate-200 text-slate-500 dark:text-slate-300",
              ].join(" ")}
            >
              {isAdmin ? (
                <ShieldCheck className="h-4 w-4 text-slate-900 dark:text-white" />
              ) : (
                <Sparkles className="h-4 w-4 text-sky-500" />
              )}
              {headerBadgeText}
            </div>
          ) : null}

          <ThemeToggleButton />

          <GuidanceLauncher />

          <GuidanceVideosLauncher userId={user?.id ?? undefined} role={user?.role} />

          <div
            className="relative ms-auto sm:ms-0"
            onMouseEnter={() => setMenuOpen(true)}
            onMouseLeave={() => setMenuOpen(false)}
            onFocus={() => setMenuOpen(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setMenuOpen(false);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setMenuOpen(false);
                event.currentTarget.querySelector<HTMLButtonElement>("button")?.focus();
              }
            }}
          >
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-0 shadow-sm shadow-slate-200/60 transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50/70 hover:shadow-lg hover:shadow-sky-100 sm:h-auto sm:w-auto sm:gap-2 sm:rounded-2xl sm:px-3 sm:py-2 dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/30 dark:hover:border-sky-500/40 dark:hover:bg-slate-900 dark:hover:shadow-black/40"
            >
              <div className="h-8 w-8 overflow-hidden rounded-full bg-sky-50 ring-2 ring-transparent transition group-hover:ring-sky-200 dark:bg-sky-500/10 dark:group-hover:ring-sky-400/30">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound className="h-5 w-5" />
                )}
              </div>

              <div className="hidden max-w-[140px] text-right sm:block">
                <p className="truncate text-[13px] font-black text-slate-900 dark:text-white">
                  {displayName}
                </p>
                <p className="truncate text-[12px] font-bold text-slate-400 dark:text-slate-500">
                  {roleText}
                </p>
              </div>

              <ChevronDown
                className={[
                  "hidden h-4 w-4 text-slate-400 transition sm:block dark:text-slate-500",
                  menuOpen ? "rotate-180" : "",
                ].join(" ")}
              />
            </button>

            {menuOpen ? (
              <div className="absolute left-0 top-full z-50 w-72 pt-2" role="menu">
              <div className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white/95 p-2 text-right shadow-2xl shadow-slate-300/60 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 dark:shadow-black/40">
                <div className="border-b border-slate-100 px-3 py-3 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-sky-50 ring-2 ring-sky-100 dark:bg-sky-500/10 dark:ring-sky-400/20">
                      <img src={avatar} alt={displayName} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                        {displayName}
                      </p>
                      <p className="mt-1 truncate text-xs font-bold text-slate-400 dark:text-slate-500">
                        {roleText}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="py-2">
                  <HeaderMenuLink
                    href="/dashboard/account"
                    icon={<UserRound className="h-4 w-4" />}
                    label={isAdmin ? "حساب الأدمن" : "حسابي والجلسات"}
                  />

                  {!isAdmin ? (
                    <HeaderMenuLink
                      href={isPrincipal ? "/dashboard/plans" : "/dashboard/subscription"}
                      icon={<WalletCards className="h-4 w-4" />}
                      label="الباقات"
                    />
                  ) : null}
                </div>

                <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={logout}
                    className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-right text-xs font-bold text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                  >
                    <LogOut className="h-4 w-4" />
                    تسجيل الخروج
                  </button>
                </div>
              </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {sidebarOpen ? createPortal(
        <div className="fixed inset-0 z-[70] md:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={() => setSidebarOpen(false)}
            aria-label="إغلاق قائمة لوحة التحكم"
          />
          <div
            id="dashboard-mobile-sidebar"
            role="dialog"
            aria-modal="true"
            aria-label="قائمة لوحة التحكم"
            className="absolute inset-y-0 right-0 w-[min(88vw,340px)] max-w-full bg-[#f5f8fc] shadow-2xl dark:bg-[#050816]"
          >
            <DashboardSidebar
              user={user}
              subscription={subscription}
              mode="drawer"
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>,
        document.body,
      ) : null}
    </header>
  );
}

function HeaderMenuLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-black text-slate-600 transition hover:bg-sky-50 hover:text-sky-700 dark:text-slate-300 dark:hover:bg-sky-500/10 dark:hover:text-sky-200"
    >
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
        {icon}
      </span>
      {label}
    </Link>
  );
}
