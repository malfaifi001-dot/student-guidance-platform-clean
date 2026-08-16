import Link from "next/link";
import type { ReactNode } from "react";
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  ClipboardCheck,
  FileCheck2,
  FolderKanban,
  Medal,
  Plus,
  School,
  ListChecks,
  TrendingUp,
  UploadCloud,
  UserRound,
  Users,
  UsersRound,
  WalletCards,
} from "lucide-react";

import type {
  WorkspaceModule,
  WorkspaceModuleIcon,
} from "@/lib/workspace/workspace-modules";
import { OFFICIAL_WORKSPACE_ROUTES } from "@/lib/workspace/workspace-modules";
import { AcademicCalendarDashboardCard } from "@/components/academic-calendar/academic-calendar-dashboard-card";
import { MobileWorkspaceModuleCarousel } from "@/components/workspace/mobile-workspace-module-carousel";
import { WorkspaceHeaderCta } from "@/components/workspace/workspace-header-cta";

type WorkspaceStatIcon =
  | "progress"
  | "students"
  | "reports"
  | "alerts"
  | "cases"
  | "evidence";

type WorkspaceActionIcon =
  | "plus"
  | "cases"
  | "reports"
  | "portfolio"
  | "calendar"
  | "programs";

type WorkspaceStat = {
  label: string;
  value: string;
  helper: string;
  icon: WorkspaceStatIcon;
  href?: string;
};

type WorkspaceAction = {
  label: string;
  href: string;
  icon: WorkspaceActionIcon;
  primary?: boolean;
};

type WorkspaceNotice = {
  title: string;
  helper: string;
};

type WorkspaceHomeProps = {
  eyebrow: string;
  title: string;
  description: string;
  userName?: string | null;
  modules: WorkspaceModule[];
  stats?: WorkspaceStat[];
  actions?: WorkspaceAction[];
  notices?: WorkspaceNotice[];
  welcomeText?: string;
  showModuleDescription?: boolean;
  schoolIdentityComplete?: boolean;
  userId?: string | null;
};

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

const statIconByName: Record<WorkspaceStatIcon, typeof TrendingUp> = {
  progress: TrendingUp,
  students: Users,
  reports: FileCheck2,
  alerts: Bell,
  cases: FolderKanban,
  evidence: UploadCloud,
};

const actionIconByName: Record<WorkspaceActionIcon, typeof Plus> = {
  plus: Plus,
  cases: FolderKanban,
  reports: FileCheck2,
  portfolio: FolderKanban,
  calendar: CalendarDays,
  programs: ClipboardList,
};

function getDisplayName(userName?: string | null) {
  return userName || "المستخدم";
}

export function WorkspaceHome({
  eyebrow,
  title,
  description,
  userName,
  modules,
  stats = [],
  actions = [],
  notices = [],
  welcomeText = "أهلًا بك",
  showModuleDescription = true,
  schoolIdentityComplete = false,
  userId,
}: WorkspaceHomeProps) {
  const headerCtaOptions = [
    {
      key: "approved-reports",
      label: "التقارير المعتمدة",
      href: OFFICIAL_WORKSPACE_ROUTES.reports,
    },
    { key: "cases", label: "الحالات", href: OFFICIAL_WORKSPACE_ROUTES.cases },
    { key: "portfolio", label: "ملف الإنجاز", href: "/dashboard/portfolio" },
    { key: "surveys", label: "الاستبيانات", href: OFFICIAL_WORKSPACE_ROUTES.surveys },
    {
      key: "assessment-center",
      label: "مركز التحليل",
      href: OFFICIAL_WORKSPACE_ROUTES.assessmentCenter,
    },
  ].filter((option) =>
    modules.some(
      (module) => module.status !== "soon" && module.href === option.href,
    ),
  );
  return (
    <main className="space-y-6" dir="rtl">
      <section className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <section className="space-y-5">
          <section className="rounded-[2.5rem] border border-sky-600/30 bg-gradient-to-br from-sky-800 via-sky-700 to-sky-500 p-6 text-white shadow-sm shadow-sky-900/10">
            <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-transparent px-0 py-0 text-xs font-black text-white/90 ring-0 md:bg-white/15 md:px-3 md:py-1 md:ring-1 md:ring-white/20">
                    {eyebrow}
                  </span>

                  <span className="hidden rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white/80 ring-1 ring-white/20 sm:inline-flex">
                    مساحة عمل موحدة
                  </span>
                </div>

                <h1 className="mt-4 text-2xl font-black leading-9 text-white sm:text-3xl sm:leading-10">
                  {welcomeText} {getDisplayName(userName)}
                </h1>

                <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-white/80">
                  {description}
                </p>
              </div>

              <div className="hidden flex-wrap gap-2 md:flex xl:justify-end">
                {actions.map((action) => {
                    const Icon = actionIconByName[action.icon];

                    return (
                      <HeroButton
                        key={`${action.href}-${action.label}`}
                        href={action.href}
                        icon={<Icon className="h-4 w-4" />}
                        label={action.label}
                        primary={action.primary}
                      />
                    );
                })}

                <WorkspaceHeaderCta
                  identityComplete={schoolIdentityComplete}
                  userId={userId}
                  options={headerCtaOptions}
                />
              </div>

              {!schoolIdentityComplete ? (
              <Link
                href="/dashboard/settings/school"
                aria-label="أكمل هوية المدرسة!"
                className="hidden"
              >
                <span className="absolute inset-0 rounded-2xl bg-sky-300/10 opacity-0 transition-opacity group-hover:opacity-100" />
                <School className="relative h-4 w-4" aria-hidden="true" />
                <span className="relative">أكمل هوية المدرسة!</span>
              </Link>
              ) : null}

              {!schoolIdentityComplete ? (
                <Link
                  href="/dashboard/settings/school"
                  aria-label="أكمل هوية المدرسة!"
                  className="hidden"
                >
                  <School className="h-4 w-4" aria-hidden="true" />
                  <span>أكمل هوية المدرسة!</span>
                </Link>
              ) : null}

              <div className="md:hidden">
                <WorkspaceHeaderCta
                  identityComplete={schoolIdentityComplete}
                  userId={userId}
                  options={headerCtaOptions}
                />
              </div>
            </div>
          </section>

          {stats.length > 0 ? (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <StatCard key={stat.label} stat={stat} />
              ))}
            </section>
          ) : null}

          <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:overflow-visible">
            <div>
              <p className="text-xs font-black text-sky-700">{title}</p>
              <h2 className="mt-1 text-right text-xs font-black leading-5 text-sky-700 md:text-2xl md:text-slate-950">
                <span className="md:hidden">اختر الخدمة</span>
                <span className="hidden md:inline">اختر الخدمة المطلوبة</span>
              </h2>
              {showModuleDescription ? (
                <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                  نفس هوية المنصة، مع محتوى وروابط مناسبة للدور الحالي.
                </p>
              ) : null}
            </div>

            <div className="mt-4 md:hidden">
              <MobileWorkspaceModuleCarousel modules={modules} />
            </div>

            <div className={`${showModuleDescription ? "mt-5" : "mt-4"} hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-4`}>
              {modules.map((module) => {
                const Icon = iconByName[module.icon];
                const isSoon = module.status === "soon";

                const card = (
                  <article
                    className={[
                      "h-full rounded-[1.5rem] border p-5 shadow-sm transition",
                      isSoon
                        ? "border-slate-100 bg-slate-50 opacity-90"
                        : "border-slate-100 bg-slate-50 hover:border-sky-200 hover:bg-white hover:shadow-sm",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700 ring-1 ring-slate-100">
                        <Icon className="h-6 w-6" />
                      </div>

                      {isSoon ? (
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-200">
                          قريبًا
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-4 text-lg font-black leading-8 text-slate-950">
                      {module.title}
                    </h3>

                    <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                      {module.description}
                    </p>
                  </article>
                );

                if (isSoon) {
                  return <div key={module.title}>{card}</div>;
                }

                return (
                  <Link key={module.title} href={module.href}>
                    {card}
                  </Link>
                );
              })}
            </div>
          </section>
        </section>

        <aside className="space-y-5">
          <AcademicCalendarDashboardCard />

          {notices.length > 0 ? (
            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black text-sky-700">تنبيهات قريبة</p>

              <div className="mt-4 space-y-3">
                {notices.map((notice) => (
                  <MiniNotice
                    key={notice.title}
                    title={notice.title}
                    helper={notice.helper}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </section>
    </main>
  );
}

function HeroButton({
  href,
  icon,
  label,
  primary,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition",
        primary
          ? "bg-sky-700 text-white hover:bg-sky-800"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      {icon}
      {label}
    </Link>
  );
}

function StatCard({ stat }: { stat: WorkspaceStat }) {
  const Icon = statIconByName[stat.icon];

  const content = (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
        <p className="text-xs font-black text-sky-700 md:text-slate-400">{stat.label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {stat.value}
          </p>
          <p className="mt-2 text-xs font-bold leading-6 text-slate-500">
            {stat.helper}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );

  if (!stat.href) return content;

  return <Link href={stat.href}>{content}</Link>;
}

function MiniNotice({ title, helper }: { title: string; helper: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-sm font-black text-slate-800">{title}</p>
      <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
        {helper}
      </p>
    </div>
  );
}
