import Link from "next/link";
import { Bell, Sparkles, UserRound } from "lucide-react";

type DashboardHeaderProps = {
  user?: {
    name?: string | null;
    officialName?: string | null;
    gender?: string | null;
    schoolAccount?: {
      name?: string | null;
      profile?: {
        schoolName?: string | null;
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

  const greeting = getRiyadhGreeting();
  const roleText = user?.gender === "FEMALE" ? "موجهة طلابية" : "موجه طلابي";

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 px-6 py-4 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 text-white shadow-lg shadow-blue-100 md:flex">
            <Sparkles className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-black text-blue-700">
              {greeting}، {displayName}
            </p>

            <h2 className="truncate text-xl font-black text-slate-950">
              لوحة {roleText}
            </h2>

            <p className="mt-1 truncate text-xs font-bold text-slate-400">
              {schoolName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black text-slate-600 md:block">
            بيئة تطوير · SaaS-ready
          </div>

          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
            aria-label="الإشعارات"
          >
            <Bell className="h-5 w-5" />
          </button>

          <Link
            href="/dashboard/account"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white transition hover:bg-slate-800"
            aria-label="حسابي"
          >
            <UserRound className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
