"use client";

import Link from "next/link";
import { MobileAppShell, type MobileShellSection } from "@/components/mobile/mobile-app-shell";
import { MobileIcon, type MobileIconName } from "@/components/mobile/mobile-icons";

type MobileAction = {
  id: string;
  title: string;
  description: string;
  icon: MobileIconName;
};

type MobileModule = {
  id: MobileShellSection;
  title: string;
  subtitle: string;
  icon: MobileIconName;
  route: string;
  metric: string;
  actions: MobileAction[];
};

type GuidanceService = {
  title: string;
  href: string;
  icon: MobileIconName;
};

const modules: MobileModule[] = [
  {
    id: "cases",
    title: "الحالات",
    subtitle: "متابعة وإجراءات وشواهد.",
    icon: "check",
    route: "/mobile/counselor/cases",
    metric: "12",
    actions: [
      { id: "new", title: "حالة جديدة", description: "إنشاء حالة.", icon: "plus" },
      { id: "active", title: "النشطة", description: "حالات مفتوحة.", icon: "clock" },
      { id: "drafts", title: "المسودات", description: "غير مكتملة.", icon: "file" },
      { id: "evidence", title: "الشواهد", description: "رفع صور وملفات.", icon: "camera" },
    ],
  },
  {
    id: "reports",
    title: "التقارير",
    subtitle: "معاينة وإصدار.",
    icon: "file",
    route: "/mobile/counselor/reports",
    metric: "8",
    actions: [
      { id: "create", title: "تقرير جديد", description: "إصدار تقرير.", icon: "plus" },
      { id: "preview", title: "المعاينة", description: "قبل التصدير.", icon: "file" },
      { id: "templates", title: "القوالب", description: "رسمية.", icon: "shield" },
      { id: "archive", title: "الأرشيف", description: "تقارير سابقة.", icon: "clock" },
    ],
  },
  {
    id: "students-upload",
    title: "بيانات الطلاب",
    subtitle: "رفع وبحث ومراجعة.",
    icon: "upload",
    route: "/mobile/counselor/students-upload",
    metric: "248",
    actions: [
      { id: "upload", title: "رفع ملف", description: "بيانات الطلاب.", icon: "upload" },
      { id: "review", title: "مراجعة", description: "قبل الاعتماد.", icon: "check" },
      { id: "students", title: "الطلاب", description: "بحث سريع.", icon: "users" },
      { id: "issues", title: "التنبيهات", description: "تحتاج تصحيح.", icon: "bell" },
    ],
  },
  {
    id: "surveys",
    title: "الاستبيانات",
    subtitle: "إنشاء وردود.",
    icon: "survey",
    route: "/mobile/counselor/surveys",
    metric: "5",
    actions: [
      { id: "create", title: "استبيان جديد", description: "إنشاء سريع.", icon: "plus" },
      { id: "drafts", title: "المسودات", description: "استكمال.", icon: "file" },
      { id: "responses", title: "الردود", description: "متابعة.", icon: "chart" },
      { id: "receiving-window", title: "الاستقبال", description: "الفترة والرابط.", icon: "calendar" },
    ],
  },
  {
    id: "assessment-center",
    title: "التحليل",
    subtitle: "نتائج وتدخلات.",
    icon: "chart",
    route: "/mobile/counselor/assessment-center",
    metric: "9",
    actions: [
      { id: "upload", title: "رفع تحليل", description: "نتائج اختبار.", icon: "upload" },
      { id: "analyses", title: "التحليلات", description: "السابقة.", icon: "chart" },
      { id: "interventions", title: "التدخلات", description: "خطط ذكية.", icon: "spark" },
      { id: "exports", title: "التصدير", description: "PDF أو Excel.", icon: "file" },
    ],
  },
];

const servicesModule: MobileModule = {
  id: "services",
  title: "الخدمات",
  subtitle: "كل المسارات.",
  icon: "grid",
  route: "/mobile/counselor/services",
  metric: "8",
  actions: [],
};

const guidanceServices: GuidanceService[] = [
  {
    title: "البرامج الإرشادية",
    href: "/mobile/counselor/guidance-programs/new",
    icon: "spark",
  },
  {
    title: "اللجان والاجتماعات",
    href: "/mobile/counselor/committees-meetings/new",
    icon: "users",
  },
  {
    title: "متابعة الطلاب",
    href: "/mobile/counselor/student-follow-up/new",
    icon: "check",
  },
  {
    title: "الخدمات الإرشادية",
    href: "/mobile/counselor/student-guidance-services/new",
    icon: "file",
  },
  {
    title: "التواصل الأسري",
    href: "/mobile/counselor/family-school-communication/new",
    icon: "users",
  },
  {
    title: "بيانات الطلاب",
    href: "/mobile/counselor/students-upload",
    icon: "upload",
  },
  {
    title: "الاستبيانات",
    href: "/mobile/counselor/surveys",
    icon: "survey",
  },
  {
    title: "مركز التحليل",
    href: "/mobile/counselor/assessment-center",
    icon: "chart",
  },
];

const allModules = [servicesModule, ...modules];

function getSection(section?: string): MobileShellSection {
  if (section === "services") return "services";
  if (section === "cases") return "cases";
  if (section === "reports") return "reports";
  if (section === "students-upload") return "students-upload";
  if (section === "surveys") return "surveys";
  if (section === "assessment-center") return "assessment-center";
  return "home";
}

function getModule(section?: string) {
  return allModules.find((module) => module.id === section);
}

function IconBox({ icon, dark = false }: { icon: MobileIconName; dark?: boolean }) {
  return (
    <span
      className={[
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1",
        dark
          ? "bg-white/75 text-sky-700 ring-sky-100"
          : "bg-slate-100/80 text-slate-500 ring-white/80",
      ].join(" ")}
    >
      <MobileIcon name={icon} className="h-5 w-5" />
    </span>
  );
}

function HomeHero() {
  return (
    <section className="relative overflow-hidden rounded-[1.8rem] bg-sky-100/80 p-4 text-slate-950 shadow-xl shadow-sky-100">
      <div className="absolute -left-12 -top-12 h-32 w-32 rounded-full bg-sky-200/70 blur-2xl" />
      <div className="absolute -bottom-16 right-10 h-36 w-36 rounded-full bg-cyan-100/80 blur-2xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black text-sky-700">صباح الخير</p>
            <h1 className="mt-1 text-[1.7rem] font-black leading-tight tracking-tight">
              ابدأ من الطالب
            </h1>
          </div>

          <IconBox icon="search" dark />
        </div>

        <Link
          href="/mobile/counselor/students-upload/students"
          className="mt-5 flex h-12 items-center justify-between rounded-2xl bg-white px-4 text-slate-950 shadow-lg shadow-sky-100 transition active:scale-[0.99]"
        >
          <span className="text-sm font-black">بحث سريع</span>
          <MobileIcon name="search" className="h-5 w-5 text-slate-500" />
        </Link>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Link
            href="/mobile/counselor/cases"
            className="rounded-2xl bg-white/75 p-2.5 text-center ring-1 ring-sky-100"
          >
            <p className="text-xl font-black">12</p>
            <p className="mt-0.5 text-[10px] font-bold text-slate-500">حالات</p>
          </Link>

          <Link
            href="/mobile/counselor/reports"
            className="rounded-2xl bg-white/75 p-2.5 text-center ring-1 ring-sky-100"
          >
            <p className="text-xl font-black">8</p>
            <p className="mt-0.5 text-[10px] font-bold text-slate-500">تقارير</p>
          </Link>

          <Link
            href="/mobile/counselor/surveys"
            className="rounded-2xl bg-white/75 p-2.5 text-center ring-1 ring-sky-100"
          >
            <p className="text-xl font-black">5</p>
            <p className="mt-0.5 text-[10px] font-bold text-slate-500">استبيانات</p>
          </Link>
        </div>
      </div>
    </section>
  );
}

function MainActions() {
  const actions = [
    {
      title: "حالة جديدة",
      href: "/mobile/counselor/cases/new",
      icon: "plus" as MobileIconName,
    },
    {
      title: "تقرير",
      href: "/mobile/counselor/reports/create",
      icon: "file" as MobileIconName,
    },
    {
      title: "استبيان",
      href: "/mobile/counselor/surveys/create",
      icon: "survey" as MobileIconName,
    },
    {
      title: "رفع تحليل",
      href: "/mobile/counselor/assessment-center/upload",
      icon: "chart" as MobileIconName,
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-2.5">
      {actions.map((action) => (
        <Link
          key={action.title}
          href={action.href}
          className="flex items-center gap-3 rounded-[1.45rem] bg-white/80 p-3 shadow-sm ring-1 ring-white/90 backdrop-blur-xl transition active:scale-[0.99]"
        >
          <IconBox icon={action.icon} />
          <span className="text-sm font-black text-slate-950">{action.title}</span>
        </Link>
      ))}
    </section>
  );
}

function GuidanceServiceCard({ service }: { service: GuidanceService }) {
  return (
    <Link
      href={service.href}
      className="flex min-h-[7.8rem] flex-col justify-between rounded-[1.45rem] bg-white/82 p-3 shadow-sm ring-1 ring-white/90 backdrop-blur-xl transition active:scale-[0.99]"
    >
      <IconBox icon={service.icon} />
      <span className="text-sm font-black leading-5 text-slate-950">{service.title}</span>
    </Link>
  );
}

function GuidanceServicesPager() {
  const pages = [
    guidanceServices.slice(0, 4),
    guidanceServices.slice(4, 8),
  ];

  return (
    <section className="space-y-2.5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-950">كل الخدمات</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">اسحب لعرض المزيد</p>
        </div>

        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
          8
        </span>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex snap-x snap-mandatory gap-3">
          {pages.map((page, pageIndex) => (
            <div
              key={`services-page-${pageIndex}`}
              className="grid w-full shrink-0 snap-start grid-cols-2 gap-2.5"
            >
              {page.map((service) => (
                <GuidanceServiceCard key={service.title} service={service} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeView() {
  return (
    <div className="space-y-4">
      <HomeHero />
      <MainActions />
      <GuidanceServicesPager />
    </div>
  );
}

function ServiceLauncherCard({ module }: { module: MobileModule }) {
  return (
    <Link
      href={module.route}
      className="rounded-[1.45rem] bg-white/80 p-3 shadow-sm ring-1 ring-white/90 backdrop-blur-xl transition active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <IconBox icon={module.icon} />
        <span className="rounded-full bg-slate-100/70 px-2.5 py-1 text-[10px] font-black text-slate-500">
          {module.metric}
        </span>
      </div>

      <p className="mt-3 text-sm font-black text-slate-950">{module.title}</p>
      <p className="mt-1 text-[11px] leading-5 text-slate-500">{module.subtitle}</p>
    </Link>
  );
}

function ServicesView() {
  return (
    <div className="space-y-4">
      <section className="rounded-[1.8rem] bg-sky-100/80 p-4 text-slate-950 shadow-xl shadow-sky-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-sky-700">القائمة</p>
            <h1 className="mt-1 text-[1.55rem] font-black leading-tight tracking-tight">
              الخدمات
            </h1>
          </div>
          <IconBox icon="grid" dark />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2.5">
        {modules.map((module) => (
          <ServiceLauncherCard key={module.id} module={module} />
        ))}
      </section>
    </div>
  );
}

function ModuleHeader({ module }: { module: MobileModule }) {
  return (
    <section className="rounded-[1.8rem] bg-sky-100/80 p-4 text-slate-950 shadow-xl shadow-sky-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-sky-700">{module.metric}</p>
          <h1 className="mt-1 text-[1.55rem] font-black leading-tight tracking-tight">
            {module.title}
          </h1>
          <p className="mt-2 text-xs leading-6 text-slate-300">{module.subtitle}</p>
        </div>

        <IconBox icon={module.icon} dark />
      </div>
    </section>
  );
}

function ActionCard({ module, action }: { module: MobileModule; action: MobileAction }) {
  return (
    <Link
      href={`/mobile/counselor/${module.id}/${action.id}`}
      className="flex items-center gap-3 rounded-[1.45rem] bg-white/80 p-3 shadow-sm ring-1 ring-white/90 backdrop-blur-xl transition active:scale-[0.99]"
    >
      <IconBox icon={action.icon} />

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-slate-950">{action.title}</span>
        <span className="mt-0.5 block text-[11px] leading-5 text-slate-500">{action.description}</span>
      </span>

      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400">
        <MobileIcon name="arrow" className="h-4 w-4" />
      </span>
    </Link>
  );
}

function ModuleView({ module }: { module: MobileModule }) {
  if (module.id === "services") return <ServicesView />;

  return (
    <div className="space-y-4">
      <ModuleHeader module={module} />

      <section className="space-y-2.5">
        {module.actions.map((action) => (
          <ActionCard key={action.id} module={module} action={action} />
        ))}
      </section>
    </div>
  );
}

function ActionRouteView({ module, actionId }: { module: MobileModule; actionId: string }) {
  const action = module.actions.find((item) => item.id === actionId) ?? module.actions[0];

  return (
    <div className="space-y-4">
      <section className="rounded-[1.8rem] bg-sky-100/80 p-4 text-slate-950 shadow-xl shadow-sky-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black text-sky-700">{module.title}</p>
            <h1 className="mt-1 text-[1.55rem] font-black leading-tight tracking-tight">
              {action.title}
            </h1>
          </div>

          <IconBox icon={action.icon} dark />
        </div>
      </section>

      <section className="rounded-[1.45rem] bg-white/80 p-4 shadow-sm ring-1 ring-white/90 backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <IconBox icon="shield" />
          <div>
            <h2 className="font-black text-slate-950">جاهز للربط</h2>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              سيتم ربط هذا المسار بالبيانات الحقيقية لاحقًا.
            </p>
          </div>
        </div>
      </section>

      <Link
        href={module.route}
        className="flex h-11 items-center justify-center rounded-2xl bg-sky-50 text-sm font-black text-sky-700 ring-1 ring-sky-100"
      >
        الرجوع
      </Link>
    </div>
  );
}

export function CounselorMobileApp({
  initialSection = "home",
  initialAction,
}: {
  initialSection?: string;
  initialAction?: string;
}) {
  const section = getSection(initialSection);
  const module = getModule(section);

  return (
    <MobileAppShell activeSection={section}>
      {section === "home" ? <HomeView /> : null}
      {section !== "home" && module && !initialAction ? <ModuleView module={module} /> : null}
      {section !== "home" && module && initialAction ? (
        <ActionRouteView module={module} actionId={initialAction} />
      ) : null}
    </MobileAppShell>
  );
}