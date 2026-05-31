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

function getRiyadhGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Asia/Riyadh",
    }).format(new Date())
  );

  if (hour >= 5 && hour < 12) return "صباح الخير";
  if (hour >= 12 && hour < 17) return "مساء النشاط";
  if (hour >= 17 && hour < 22) return "مساء الخير";

  return "أهلًا بك";
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const displayName = user?.officialName || user?.name || "الموجه/الموجهة";

  const schoolName =
    user?.schoolAccount?.profile?.schoolName ||
    user?.schoolAccount?.name ||
    "منصة التوجيه الطلابي";

  const avatar =
    user?.schoolAccount?.profile?.logoUrl ||
    (user?.gender === "FEMALE"
      ? "/uploads/VD/girl.png"
      : "/uploads/VD/boy.png");

  const greeting = getRiyadhGreeting();
  const roleText =
    user?.jobTitle ||
    (user?.gender === "FEMALE" ? "موجهة طلابية" : "موجه طلابي");

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-[#f8fbff]/85 px-5 py-4 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/dashboard/account"
            className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 text-white shadow-sm"
          >
            {avatar ? (
              <img
                src={avatar}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              <UserRound className="h-5 w-5" />
            )}
          </Link>

          <div className="min-w-0">
            <p className="text-sm font-black text-sky-700">
              {greeting}، {displayName}
            </p>

            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-black text-slate-950">
                لوحة {roleText}
              </h2>

              <span className="hidden rounded-full bg-sky-50 px-3 py-1 text-[11px] font-black text-sky-700 md:inline-flex">
                {schoolName}
              </span>
            </div>
          </div>
        </div>

        <div className="hidden min-w-[320px] max-w-xl flex-1 lg:block">
          <div className="relative">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="ابحث عن طالب، خدمة، حالة أو تقرير..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-12 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-500 shadow-sm md:flex">
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
            className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:bg-slate-50 md:flex"
          >
            <div className="h-8 w-8 overflow-hidden rounded-xl bg-sky-50">
              <img
                src={avatar}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="max-w-[120px] text-right">
              <p className="truncate text-xs font-black text-slate-900">
                {displayName}
              </p>
              <p className="truncate text-[11px] font-bold text-slate-400">
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
