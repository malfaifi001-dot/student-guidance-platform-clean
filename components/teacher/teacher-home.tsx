import Link from "next/link";
import type { ReactNode } from "react";
import {
  BarChart3,
  BellRing,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  FileCheck2,
  FilePlus2,
  FolderKanban,
  Headphones,
  ListChecks,
  Plus,
  School,
  Settings,
  UploadCloud,
  UsersRound,
} from "lucide-react";

import type { WorkspaceModule } from "@/lib/workspace/workspace-modules";
import { OFFICIAL_WORKSPACE_ROUTES } from "@/lib/workspace/workspace-modules";
import { TeachixLogo } from "@/components/brand/teachix-logo";

type TeacherHomeNotice = {
  title: string;
  helper: string;
};

type TeacherHomeProps = {
  userName?: string | null;
  modules: WorkspaceModule[];
  notices?: TeacherHomeNotice[];
  schoolIdentityComplete?: boolean;
};

type ServiceCardConfig = {
  title: string;
  helper: string;
  href: string;
  icon: ReactNode;
  accentClassName: string;
  status?: "available" | "soon";
};

type QuickActionConfig = {
  title: string;
  href: string;
  icon: ReactNode;
  accentClassName: string;
};

function getDisplayName(userName?: string | null) {
  return userName?.trim() || "المعلم";
}

function findModule(
  modules: WorkspaceModule[],
  predicate: (module: WorkspaceModule) => boolean,
) {
  return modules.find(predicate);
}

export function TeacherHome({
  userName,
  modules,
  notices = [],
  schoolIdentityComplete = false,
}: TeacherHomeProps) {
  const casesModule = findModule(
    modules,
    (module) => module.href === OFFICIAL_WORKSPACE_ROUTES.cases,
  );

  const reportsModule = findModule(
    modules,
    (module) => module.href === OFFICIAL_WORKSPACE_ROUTES.reports,
  );

  const assignmentsModule = findModule(
    modules,
    (module) => module.href === "/dashboard/teacher/assignments",
  );

  const calendarModule = findModule(
    modules,
    (module) => module.href === "/dashboard/teacher/calendar",
  );

  const surveysModule = findModule(
    modules,
    (module) => module.href === OFFICIAL_WORKSPACE_ROUTES.surveys,
  );

  const assessmentModule = findModule(
    modules,
    (module) => module.href === "/dashboard/assessments-center",
  );

  const schoolSettingsModule = findModule(
    modules,
    (module) => module.href === "/dashboard/settings/school",
  );

  const portfolioModule = findModule(
    modules,
    (module) => module.href === "/dashboard/teacher/portfolio",
  );

  const serviceCards: ServiceCardConfig[] = [
    {
      title: assignmentsModule?.title || "تكليفاتي",
      helper:
        assignmentsModule?.description ||
        "متابعة التكليفات المرسلة لك من المدرسة وتنفيذ المطلوب.",
      href: assignmentsModule?.href || "/dashboard/teacher/assignments",
      icon: <UsersRound className="h-7 w-7" />,
      accentClassName: "text-orange-500",
      status: assignmentsModule?.status,
    },
    {
      title: portfolioModule?.title || "ملف الإنجاز",
      helper:
        portfolioModule?.description ||
        "ملف موحد يجمع مشاركاتك وشواهدك وتكليفاتك.",
      href: portfolioModule?.href || "/dashboard/teacher/portfolio",
      icon: <BriefcaseBusiness className="h-7 w-7" />,
      accentClassName: "text-violet-600",
      status: portfolioModule?.status,
    },
    {
      title: reportsModule?.title || "التقارير",
      helper:
        reportsModule?.description ||
        "استعراض التقارير من محرك التقارير الرسمي.",
      href: reportsModule?.href || OFFICIAL_WORKSPACE_ROUTES.reports,
      icon: <FileCheck2 className="h-7 w-7" />,
      accentClassName: "text-blue-600",
      status: reportsModule?.status,
    },
    {
      title: casesModule?.title || "الحالات",
      helper:
        casesModule?.description ||
        "متابعة الحالات المتاحة ضمن نطاق المدرسة والصلاحيات.",
      href: casesModule?.href || OFFICIAL_WORKSPACE_ROUTES.cases,
      icon: <ClipboardCheck className="h-7 w-7" />,
      accentClassName: "text-blue-600",
      status: casesModule?.status,
    },
    {
      title: calendarModule?.title || "التقويم والتنبيهات",
      helper:
        calendarModule?.description ||
        "إدارة المهام والمواعيد والتنبيهات اليومية.",
      href: calendarModule?.href || "/dashboard/teacher/calendar",
      icon: <CalendarDays className="h-7 w-7" />,
      accentClassName: "text-blue-600",
      status: calendarModule?.status,
    },
    {
      title: assessmentModule?.title || "التحليل والإحصاءات",
      helper:
        assessmentModule?.description ||
        "تحليل نتائج الطلاب ومراجعة المؤشرات والتقارير.",
      href: assessmentModule?.href || "/dashboard/assessments-center",
      icon: <BarChart3 className="h-7 w-7" />,
      accentClassName: "text-emerald-600",
      status: assessmentModule?.status,
    },
    {
      title: surveysModule?.title || "الاستبيانات",
      helper:
        surveysModule?.description ||
        "إنشاء ومتابعة الاستبيانات وتحليل الردود.",
      href: surveysModule?.href || OFFICIAL_WORKSPACE_ROUTES.surveys,
      icon: <ListChecks className="h-7 w-7" />,
      accentClassName: "text-violet-600",
      status: surveysModule?.status,
    },
    {
      title: schoolSettingsModule?.title || "الإعدادات",
      helper:
        schoolSettingsModule?.description ||
        "تحديث بيانات المدرسة والهوية الرسمية.",
      href: schoolSettingsModule?.href || "/dashboard/settings/school",
      icon: <Settings className="h-7 w-7" />,
      accentClassName: "text-slate-600",
      status: schoolSettingsModule?.status,
    },
  ];

  const quickActions: QuickActionConfig[] = [
    {
      title: "إنشاء حالة جديدة",
      href: OFFICIAL_WORKSPACE_ROUTES.cases,
      icon: <Plus className="h-6 w-6" />,
      accentClassName: "text-emerald-600",
    },
    {
      title: "تقرير جديد",
      href: "/dashboard/teacher/report-issuance/new",
      icon: <FilePlus2 className="h-6 w-6" />,
      accentClassName: "text-blue-600",
    },
    {
      title: "رفع شاهد",
      href: "/dashboard/teacher/evidence",
      icon: <UploadCloud className="h-6 w-6" />,
      accentClassName: "text-violet-600",
    },
    {
      title: "إضافة تذكير",
      href: "/dashboard/teacher/calendar",
      icon: <BellRing className="h-6 w-6" />,
      accentClassName: "text-orange-500",
    },
    {
      title: "الاستبيانات",
      href: OFFICIAL_WORKSPACE_ROUTES.surveys,
      icon: <ListChecks className="h-6 w-6" />,
      accentClassName: "text-blue-600",
    },
    {
      title: "طلب دعم",
      href: "/dashboard/support",
      icon: <Headphones className="h-6 w-6" />,
      accentClassName: "text-violet-600",
    },
  ];

  return (
    <main
      dir="rtl"
      className="mx-auto w-full max-w-[1480px] space-y-5 pb-8"
    >
      <TeacherHero
        userName={getDisplayName(userName)}
        schoolIdentityComplete={schoolIdentityComplete}
        portfolioSoon={portfolioModule?.status === "soon"}
      />

      <section className="grid gap-5 xl:grid-cols-2">
        <TeacherServicesSection services={serviceCards} />
        <TeacherQuickActions actions={quickActions} />
      </section>

      <TeacherUpcomingSection notices={notices} />
    </main>
  );
}

function TeacherHero({
  userName,
  schoolIdentityComplete,
  portfolioSoon,
}: {
  userName: string;
  schoolIdentityComplete: boolean;
  portfolioSoon: boolean;
}) {
  return (
    <section className="relative overflow-hidden rounded-[30px] border border-sky-700/20 bg-gradient-to-l from-cyan-500 via-blue-700 to-[#071a3b] text-white shadow-[0_18px_50px_rgba(15,76,129,0.18)]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.10),transparent_22%),radial-gradient(circle_at_56%_70%,rgba(255,255,255,0.07),transparent_20%)]"
      />

      <div
        aria-hidden="true"
        className="absolute -left-16 -top-20 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl"
      />

      <div className="relative grid min-h-[220px] grid-cols-[1.12fr_0.88fr] items-center gap-1 px-3 py-3 sm:min-h-[280px] sm:gap-4 sm:px-5 sm:py-5 md:min-h-[285px] md:gap-8 md:px-8 md:py-7 lg:px-10">
        <div className="order-1">
          <div className="flex items-center gap-3">
            <span className="h-4 w-1 rounded-full bg-emerald-400 sm:h-5 md:h-6" />
            <p className="text-[10px] font-black text-white/95 sm:text-[12px] md:text-sm">
              مساحة المعلم
            </p>
          </div>

          <h1 className="mt-3 text-[20px] font-black leading-[1.3] text-white sm:text-[26px] md:text-3xl md:mt-4 xl:text-[40px]">
            أهلًا بك {userName}
          </h1>

          <p className="mt-3 max-w-[680px] text-[10px] font-bold leading-5 text-white/85 sm:text-[12px] sm:leading-6 md:text-[15px] md:leading-8 md:mt-4">
            ابدأ من خدمات المعلم، تابع التكليفات والشواهد، ثم استعرض التقارير
            وملف الإنجاز بنفس هوية المنصة الموحدة.
          </p>

          <div className="mt-6 hidden flex-wrap gap-3 md:flex">
            {!portfolioSoon ? (
              <HeroLink
                href="/dashboard/teacher/portfolio"
                label="ملف إنجازي"
                icon={<BriefcaseBusiness className="h-5 w-5" />}
              />
            ) : null}

            <HeroLink
              href={OFFICIAL_WORKSPACE_ROUTES.reports}
              label="تقاريري"
              icon={<FileCheck2 className="h-5 w-5" />}
            />

            <HeroLink
              href={OFFICIAL_WORKSPACE_ROUTES.cases}
              label="الحالات"
              icon={<FolderKanban className="h-5 w-5" />}
            />
          </div>

          {!schoolIdentityComplete ? (
            <div className="mt-6">
              <Link
                href="/dashboard/settings/school"
                className="inline-flex min-h-12 w-full max-w-[270px] items-center justify-center gap-3 rounded-2xl bg-white px-4 py-3 text-[14px] font-black text-blue-700 shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-blue-50 sm:px-7 sm:text-base"
              >
                <School className="h-5 w-5" />
                أكمل هوية المدرسة
              </Link>
            </div>
          ) : null}
        </div>

        <div className="order-2">
          <TeacherHeroIllustration />
        </div>
      </div>

      <div className="absolute bottom-2 left-1/2 sm:bottom-3 md:bottom-4 flex -translate-x-1/2 items-center gap-2">
        <span className="h-2 w-5 rounded-full bg-white sm:h-2.5 sm:w-7" />
        <span className="h-2 w-2 rounded-full bg-white/45 sm:h-2.5 sm:w-2.5" />
        <span className="h-2 w-2 rounded-full bg-white/35 sm:h-2.5 sm:w-2.5" />
        <span className="h-2 w-2 rounded-full bg-white/25 sm:h-2.5 sm:w-2.5" />
      </div>
    </section>
  );
}
function TeacherHeroIllustration() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto flex h-[135px] w-full max-w-[90px] items-center justify-center sm:h-[175px] sm:max-w-[130px] md:h-[220px] md:max-w-[390px]"
    >
      <div className="absolute bottom-7 left-4 h-28 w-28 rounded-full bg-emerald-500/10 blur-2xl" />

      <div className="absolute bottom-6 left-12 h-28 w-8 rounded-[18px] bg-white/90 shadow-xl" />

      <div className="absolute bottom-16 left-4 h-16 w-9 rotate-[-35deg] rounded-full bg-emerald-500/90" />
      <div className="absolute bottom-24 left-17 h-16 w-9 rotate-[35deg] rounded-full bg-emerald-400/90" />

      <div className="relative flex h-[105px] w-[72px] -rotate-6 flex-col rounded-[24px] border-[6px] border-slate-800 bg-slate-100 p-2 shadow-[0_18px_40px_rgba(0,0,0,0.28)] sm:h-[145px] sm:w-[100px] sm:p-4 md:h-[205px] md:w-[155px] md:rounded-[30px] md:border-[7px] md:p-5">
        <div className="absolute left-1/2 top-[-14px] h-7 w-16 -translate-x-1/2 rounded-xl bg-slate-700" />

        <div className="mt-5 space-y-5 sm:space-y-6 md:space-y-7">
          <IllustrationCheck />
          <IllustrationCheck />
          <IllustrationCheck />
        </div>
      </div>

      <div className="absolute bottom-7 right-9 h-28 w-16 rounded-b-[20px] rounded-t-xl bg-white/90 shadow-xl">
        <div className="absolute left-3 top-[-30px] h-14 w-2 rotate-6 rounded-full bg-blue-300" />
        <div className="absolute left-7 top-[-38px] h-18 w-2 -rotate-3 rounded-full bg-slate-300" />
        <div className="absolute left-10 top-[-32px] h-15 w-2 rotate-3 rounded-full bg-white" />
      </div>
    </div>
  );
}

function IllustrationCheck() {
  return (
    <div className="flex items-center gap-3">
      <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" />

      <div className="space-y-2">
        <span className="block h-2 w-16 rounded-full bg-blue-500/70" />
        <span className="block h-1.5 w-10 rounded-full bg-slate-300" />
      </div>
    </div>
  );
}

function HeroLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/40 bg-white/95 px-6 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
    >
      {icon}
      {label}
    </Link>
  );
}

function TeacherServicesSection({
  services,
}: {
  services: ServiceCardConfig[];
}) {
  return (
    <section className="rounded-[26px] border border-slate-200/70 bg-white p-4 shadow-[0_10px_35px_rgba(15,23,42,0.05)] sm:p-5 dark:border-slate-800 dark:bg-slate-950">
      <SectionHeader
        title="خدمات المعلم"
        eyebrow="الخدمات الأساسية"
        actionLabel="عرض الكل"
        actionHref="/dashboard/teacher"
      />

      <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-3">
        {services.map((service) => (
          <TeacherServiceCard
            key={`${service.href}-${service.title}`}
            service={service}
          />
        ))}
      </div>
    </section>
  );
}

function TeacherServiceCard({
  service,
}: {
  service: ServiceCardConfig;
}) {
  const isSoon = service.status === "soon";

  const content = (
    <article
      className={[
        "group relative flex min-h-[118px] flex-col items-center justify-center rounded-[18px] border px-1.5 py-3 text-center transition sm:min-h-[132px] sm:rounded-[20px] sm:px-3 sm:py-4",
        isSoon
          ? "border-slate-100 bg-slate-50/80 opacity-80 dark:border-slate-800 dark:bg-slate-900/70"
          : "border-slate-100 bg-gradient-to-b from-white to-slate-50 hover:-translate-y-1 hover:border-sky-200 hover:bg-white hover:shadow-md dark:border-slate-800 dark:from-slate-900 dark:to-slate-950 dark:hover:border-sky-700",
      ].join(" ")}
    >
      {isSoon ? (
        <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-1 text-[9px] font-black text-slate-400 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-700">
          قريبًا
        </span>
      ) : null}

      <span
        className={[
          "grid h-10 w-10 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition group-hover:scale-105 sm:h-11 sm:w-11 dark:bg-slate-950 dark:ring-slate-800",
          service.accentClassName,
        ].join(" ")}
      >
        {service.icon}
      </span>

      <h3 className="mt-3 text-[10.5px] font-black leading-5 text-slate-800 sm:text-[13px] sm:leading-6 dark:text-white">
        {service.title}
      </h3>
    </article>
  );

  if (isSoon) {
    return <div>{content}</div>;
  }

  return (
    <Link href={service.href} title={service.helper}>
      {content}
    </Link>
  );
}

function TeacherQuickActions({
  actions,
}: {
  actions: QuickActionConfig[];
}) {
  return (
    <section className="rounded-[26px] border border-slate-200/70 bg-white p-4 shadow-[0_10px_35px_rgba(15,23,42,0.05)] sm:p-5 dark:border-slate-800 dark:bg-slate-950">
      <SectionHeader
        title="منتجات سريعة"
        eyebrow="اختصارات يومية"
      />

      <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-3 md:grid-cols-3">
        {actions.map((action, index) => (
          <Link
            key={`${action.href}-${action.title}`}
            href={action.href}
            className={`group min-h-[104px] flex-col items-center justify-center rounded-[18px] border border-slate-100 bg-gradient-to-b from-white to-slate-50 px-1.5 py-3 text-center transition hover:-translate-y-1 hover:border-sky-200 hover:bg-white hover:shadow-md sm:min-h-[112px] sm:rounded-[20px] sm:px-3 sm:py-4 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950 dark:hover:border-sky-700 ${index >= 4 ? "hidden md:flex" : "flex"}` }
          >
            <span
              className={[
                "grid h-10 w-10 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition group-hover:scale-105 sm:h-11 sm:w-11 dark:bg-slate-950 dark:ring-slate-800",
                action.accentClassName,
              ].join(" ")}
            >
              {action.icon}
            </span>

            <span className="mt-3 text-[12.5px] font-black text-slate-800 dark:text-white">
              {action.title}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function TeacherUpcomingSection({
  notices,
}: {
  notices: TeacherHomeNotice[];
}) {
  const visibleNotices = notices.slice(0, 3);

  return (
    <section className="rounded-[26px] border border-slate-200/70 bg-white p-4 shadow-[0_10px_35px_rgba(15,23,42,0.05)] sm:p-5 dark:border-slate-800 dark:bg-slate-950">
      <SectionHeader
        title="تكليفاتي القادمة"
        eyebrow="المهام والتنبيهات"
        actionLabel="عرض الكل"
        actionHref="/dashboard/teacher/calendar"
      />

      <div className="mt-5">
        {visibleNotices.length > 0 ? (
          <div className="space-y-3">
            {visibleNotices.map((notice, index) => (
              <UpcomingNotice
                key={`${notice.title}-${index}`}
                notice={notice}
                urgent={index === 0}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[120px] items-center justify-center rounded-[20px] border border-dashed border-slate-200 bg-slate-50/70 px-5 text-center dark:border-slate-800 dark:bg-slate-900/40">
            <div>
              <CalendarDays className="mx-auto h-7 w-7 text-sky-500" />

              <p className="mt-3 text-sm font-black text-slate-700 dark:text-slate-200">
                لا توجد تكليفات أو تنبيهات قريبة
              </p>

              <p className="mt-1 text-xs font-bold text-slate-400">
                ستظهر هنا مواعيدك القادمة عند إضافتها.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function UpcomingNotice({
  notice,
  urgent,
}: {
  notice: TeacherHomeNotice;
  urgent: boolean;
}) {
  return (
    <Link
      href="/dashboard/teacher/calendar"
      className="group grid gap-4 rounded-[20px] border border-slate-100 bg-slate-50/70 p-4 transition hover:border-sky-200 hover:bg-white hover:shadow-sm md:grid-cols-[auto_1fr_auto] md:items-center dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-sky-700 dark:hover:bg-slate-900"
    >
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-100 dark:bg-slate-950 dark:ring-slate-800">
        <CalendarDays className="h-5 w-5" />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-black text-slate-900 dark:text-white">
            {notice.title}
          </h3>

          {urgent ? (
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black text-orange-600 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-400/10">
              قريبًا
            </span>
          ) : null}
        </div>

        <p className="mt-1 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">
          {notice.helper}
        </p>
      </div>

      <ChevronLeft className="hidden h-5 w-5 text-slate-300 transition group-hover:-translate-x-1 group-hover:text-sky-600 md:block" />
    </Link>
  );
}

function SectionHeader({
  title,
  eyebrow,
  actionLabel,
  actionHref,
}: {
  title: string;
  eyebrow?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-black text-sky-600">
            {eyebrow}
          </p>
        ) : null}

        <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
          {title}
        </h2>
      </div>

      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-1 text-xs font-black text-blue-600 transition hover:text-blue-700"
        >
          {actionLabel}
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}