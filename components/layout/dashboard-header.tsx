"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeToggleButton } from "@/components/theme/theme-toggle-button";
import {
  Bell,
  ChevronDown,
  LogOut,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
} from "lucide-react";

type DashboardHeaderProps = {
  user?: {
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
};

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdmin =
    user?.role === "ADMIN" || pathname.startsWith("/dashboard/admin");

  const isActivityLeader =
    user?.role === "ACTIVITY_LEADER" ||
    pathname.startsWith("/dashboard/activity-leader");

  const isTeacher =
    user?.role === "TEACHER" || pathname.startsWith("/dashboard/teacher");

  const displayName = user?.officialName || user?.name || "حسابي";

  const avatar =
    user?.schoolAccount?.profile?.logoUrl ||
    (user?.gender === "FEMALE"
      ? "/uploads/VD/girl.png"
      : "/uploads/VD/boy.png");

  const roleText = isAdmin
    ? "مدير النظام"
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
      : "ابحث عن طالب، خدمة، حالة أو تقرير...";

  const headerBadgeText = isAdmin
    ? "Admin Center"
    : isActivityLeader
      ? "ريادة النشاط"
      : isTeacher
        ? "مساحة المعلم"
      : "منصة التوجيه الطلابي";

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-[#f7faff]/85 px-4 py-2.5 backdrop-blur-xl dark:border-slate-800 dark:bg-[#070b18]/88">
      <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-4">
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

        <div className="flex flex-1 items-center gap-2 lg:flex-none">
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

          <ThemeToggleButton />

          <button
            type="button"
            className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-sky-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-sky-300"
            aria-label="الإشعارات"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">
              4
            </span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="group flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm shadow-slate-200/60 transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50/70 hover:shadow-lg hover:shadow-sky-100 dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/30 dark:hover:border-sky-500/40 dark:hover:bg-slate-900 dark:hover:shadow-black/40"
            >
              <div className="h-8 w-8 overflow-hidden rounded-xl bg-sky-50 ring-2 ring-transparent transition group-hover:ring-sky-200 dark:bg-sky-500/10 dark:group-hover:ring-sky-400/30">
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
                  "h-4 w-4 text-slate-400 transition dark:text-slate-500",
                  menuOpen ? "rotate-180" : "",
                ].join(" ")}
              />
            </button>

            {menuOpen ? (
              <div className="absolute left-0 top-14 z-50 w-72 overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white/95 p-2 text-right shadow-2xl shadow-slate-300/60 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 dark:shadow-black/40">
                <div className="border-b border-slate-100 px-3 py-3 dark:border-slate-800">
                  <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                    {displayName}
                  </p>
                  <p className="mt-1 truncate text-xs font-bold text-slate-400 dark:text-slate-500">
                    {roleText}
                  </p>
                </div>

                <div className="py-2">
                  <HeaderMenuLink
                    href="/dashboard/account"
                    icon={<UserRound className="h-4 w-4" />}
                    label={isAdmin ? "حساب الأدمن" : "حسابي والجلسات"}
                  />

                  {!isAdmin ? (
                    <HeaderMenuLink
                      href="/dashboard/subscription"
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
            ) : null}
          </div>
        </div>
      </div>
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
