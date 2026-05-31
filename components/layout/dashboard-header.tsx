import Link from "next/link";
import {
  Bell,
  ChevronDown,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";

type DashboardHeaderProps = {
  user?: {
    name?: string | null;
    officialName?: string | null;
    gender?: string | null;
    jobTitle?: string | null;
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
  const displayName = user?.officialName || user?.name || "حسابي";

  const avatar =
    user?.schoolAccount?.profile?.logoUrl ||
    (user?.gender === "FEMALE"
      ? "/uploads/VD/girl.png"
      : "/uploads/VD/boy.png");

  const roleText =
    user?.jobTitle ||
    (user?.gender === "FEMALE" ? "موجهة طلابية" : "موجه طلابي");

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-[#f7faff]/85 px-4 py-2.5 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-4">
        <div className="hidden min-w-[360px] max-w-2xl flex-1 lg:block">
          <div className="relative">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="ابحث عن طالب، خدمة، حالة أو تقرير..."
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-12 text-[15px] font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
            />
          </div>
        </div>

        <div className="flex flex-1 items-center gap-2 lg:flex-none">
          <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-black text-slate-500 shadow-sm md:flex">
            <Sparkles className="h-4 w-4 text-sky-500" />
            بيئة تطوير · SaaS-ready
          </div>

          <button
            type="button"
            className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-sky-600"
            aria-label="الإشعارات"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">
              4
            </span>
          </button>

          <Link
            href="/dashboard/account"
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:bg-slate-50"
          >
            <div className="h-8 w-8 overflow-hidden rounded-xl bg-sky-50">
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
              <p className="truncate text-[13px] font-black text-slate-900">
                {displayName}
              </p>
              <p className="truncate text-[12px] font-bold text-slate-400">
                {roleText}
              </p>
            </div>

            <ChevronDown className="h-4 w-4 text-slate-400" />
          </Link>
        </div>
      </div>
    </header>
  );
}
