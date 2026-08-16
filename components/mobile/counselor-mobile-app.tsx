"use client";

import Link from "next/link";
import { useState } from "react";
import { MobileAppShell, type MobileShellSection } from "@/components/mobile/mobile-app-shell";
import { MobileIcon, type MobileIconName } from "@/components/mobile/mobile-icons";
import { MobilePopCard } from "@/components/mobile/mobile-pop-card";

type MobileAction = {
  id: string;
  title: string;
  description: string;
  icon: MobileIconName;
  href?: string;
};

type MobileModule = {
  id: MobileShellSection;
  title: string;
  subtitle: string;
  icon: MobileIconName;
  route?: string;
  available?: boolean;
  metric: string;
  actions: MobileAction[];
};

type GuidanceService = {
  title: string;
  href?: string;
  icon: MobileIconName;
};

const unavailableTitle = "\u0645\u0633\u0627\u0631 \u063a\u064a\u0631 \u0645\u062a\u0627\u062d \u0639\u0644\u0649 \u0627\u0644\u0647\u0627\u062a\u0641 \u0628\u0639\u062f";
const unavailableDescription = "\u0633\u064a\u062a\u0645 \u062a\u0648\u0641\u064a\u0631 \u0647\u0630\u0627 \u0627\u0644\u0645\u0633\u0627\u0631 \u0639\u0646\u062f \u062c\u0627\u0647\u0632\u064a\u062a\u0647 \u0636\u0645\u0646 \u062a\u0637\u0628\u064a\u0642 \u0627\u0644\u0647\u0627\u062a\u0641.";

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
    available: false,
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
    available: false,
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
    available: false,
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
    available: false,
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
    title: "برامج التوجيه الطلابي",
    href: "/mobile/counselor/guidance-programs/new",
    icon: "spark",
  },
  {
    title: "اللجان والاجتماعات",
    href: "/mobile/counselor/committees-meetings/new",
    icon: "users",
  },
  {
    title: "متابعة الطلبة والمواقف اليومية الطارئة",
    href: "/mobile/counselor/student-follow-up/new",
    icon: "check",
  },
  {
    title: "خدمات التوجيه الطلابي",
    href: "/mobile/counselor/student-guidance-services/new",
    icon: "file",
  },
  {
    title: "التواصل بين الأسرة والمدرسة وزيارات أولياء الأمور",
    href: "/mobile/counselor/family-school-communication/new",
    icon: "users",
  },
  {
    title: "بيانات الطلاب",
    icon: "upload",
  },
  {
    title: "الاستبيانات",
    icon: "survey",
  },
  {
    title: "مركز التحليل",
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

function HomeHero({ userName, onUnavailable }: { userName?: string; onUnavailable: () => void }) {
  const firstName = String(userName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)[0];

  return (
    <section className="relative overflow-hidden rounded-[1.85rem] bg-[radial-gradient(circle_at_25%_100%,rgba(14,116,144,0.32),transparent_35%),linear-gradient(135deg,#0f2742_0%,#030712_50%,#020617_100%)] p-4 text-white shadow-[0_10px_24px_rgba(2,6,23,0.16)]">
      <div className="absolute -left-14 -top-14 h-36 w-36 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-32 w-32 rounded-full bg-cyan-300/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-black leading-7 text-sky-100">
              {firstName ? `صباح الخير، ${firstName}` : "صباح الخير"}
            </p>
          </div>

          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.25rem] bg-white/12 text-white ring-1 ring-white/10">
            <MobileIcon name="spark" className="h-5 w-5" />
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1 text-center">
          <Link href="/mobile/counselor/cases" className="rounded-[1rem] px-1 py-1.5 transition active:scale-[0.98]">
            <p className="text-[1.35rem] font-black leading-none text-white">12</p>
            <p className="mt-1 text-[9px] font-black leading-none text-white/75">حالات نشطة</p>
          </Link>

          <button type="button" onClick={onUnavailable} className="rounded-[1rem] px-1 py-1.5 text-right transition active:scale-[0.98]">
            <p className="text-[1.35rem] font-black leading-none text-white">8</p>
            <p className="mt-1 text-[9px] font-black leading-none text-white/75">تقارير جاهزة</p>
          </button>

          <button type="button" onClick={onUnavailable} className="rounded-[1rem] px-1 py-1.5 text-right transition active:scale-[0.98]">
            <p className="text-[1.35rem] font-black leading-none text-white">5</p>
            <p className="mt-1 text-[9px] font-black leading-none text-white/75">استبيانات</p>
          </button>
        </div>
      </div>
    </section>
  );
}

function MainActions({ onUnavailable }: { onUnavailable: () => void }) {
  const actions = [
    {
      title: "حالة جديدة",
      href: "/mobile/counselor/cases/new",
      icon: "plus" as MobileIconName,
    },
    {
      title: "تقرير",
      icon: "file" as MobileIconName,
    },
    {
      title: "استبيان",
      icon: "survey" as MobileIconName,
    },
    {
      title: "رفع تحليل",
      icon: "chart" as MobileIconName,
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-2.5">
      {actions.map((action) => (
        action.href ? <Link
          key={action.title}
          href={action.href}
          className="flex items-center gap-3 rounded-[1.45rem] bg-white/80 p-3 shadow-sm ring-1 ring-white/90 backdrop-blur-xl transition active:scale-[0.99]"
        >
          <IconBox icon={action.icon} />
          <span className="text-sm font-black text-slate-950">{action.title}</span>
        </Link> : <button key={action.title} type="button" onClick={onUnavailable} className="flex items-center gap-3 rounded-[1.45rem] bg-white/80 p-3 text-right shadow-sm ring-1 ring-white/90 backdrop-blur-xl transition active:scale-[0.99]">
          <IconBox icon={action.icon} />
          <span className="text-sm font-black text-slate-950">{action.title}</span>
        </button>
      ))}
    </section>
  );
}

function GuidanceServiceCard({ service, onUnavailable }: { service: GuidanceService; onUnavailable: () => void }) {
  const content = <>
    <IconBox icon={service.icon} />
    <span className="text-sm font-black leading-5 text-slate-950">{service.title}</span>
  </>;

  return service.href ? (
    <Link
      href={service.href}
      className="flex min-h-[7.8rem] flex-col justify-between rounded-[1.45rem] bg-white/82 p-3 shadow-sm ring-1 ring-white/90 backdrop-blur-xl transition active:scale-[0.99]"
    >
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onUnavailable} className="flex min-h-[7.8rem] flex-col justify-between rounded-[1.45rem] bg-white/82 p-3 text-right shadow-sm ring-1 ring-white/90 backdrop-blur-xl transition active:scale-[0.99]">
      {content}
    </button>
  );
}

function GuidanceServicesPager({ onUnavailable }: { onUnavailable: () => void }) {
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
                <GuidanceServiceCard key={service.title} service={service} onUnavailable={onUnavailable} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeView({ userName, onUnavailable }: { userName?: string; onUnavailable: () => void }) {
  return (
    <div className="space-y-4">
      <HomeHero userName={userName} onUnavailable={onUnavailable} />
      <MainActions onUnavailable={onUnavailable} />
      <GuidanceServicesPager onUnavailable={onUnavailable} />
    </div>
  );
}

function ServiceLauncherCard({ module, onUnavailable }: { module: MobileModule; onUnavailable: () => void }) {
  const route = module.route;
  const content = <>
    <div className="flex items-start justify-between gap-2">
      <IconBox icon={module.icon} />
      <span className="rounded-full bg-slate-100/70 px-2.5 py-1 text-[10px] font-black text-slate-500">{module.metric}</span>
    </div>
    <p className="mt-3 text-sm font-black text-slate-950">{module.title}</p>
    <p className="mt-1 text-[11px] leading-5 text-slate-500">{module.subtitle}</p>
  </>;

  if (module.available === false || !route) {
    return <button type="button" onClick={onUnavailable} className="rounded-[1.45rem] bg-white/80 p-3 text-right shadow-sm ring-1 ring-white/90 backdrop-blur-xl transition active:scale-[0.99]">{content}</button>;
  }

  return (
    <Link
      href={route}
      className="rounded-[1.45rem] bg-white/80 p-3 shadow-sm ring-1 ring-white/90 backdrop-blur-xl transition active:scale-[0.99]"
    >
      {content}
    </Link>
  );
}

function ServicesView({ onUnavailable }: { onUnavailable: () => void }) {
  return (
    <div className="space-y-4">
      <section className="rounded-[1.8rem] bg-gradient-to-br from-[#064967] to-[#075f7a] p-4 text-white shadow-[0_10px_24px_rgba(6,73,103,0.16)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-sky-100">القائمة</p>
            <h1 className="mt-1 text-[1.55rem] font-black leading-tight tracking-tight">
              الخدمات
            </h1>
          </div>
          <IconBox icon="grid" dark />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2.5">
        {modules.map((module) => (
          <ServiceLauncherCard key={module.id} module={module} onUnavailable={onUnavailable} />
        ))}
      </section>
    </div>
  );
}

function ModuleHeader({ module }: { module: MobileModule }) {
  return (
    <section className="rounded-[1.8rem] bg-gradient-to-br from-[#064967] to-[#075f7a] p-4 text-white shadow-[0_10px_24px_rgba(6,73,103,0.16)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-sky-100">{module.metric}</p>
          <h1 className="mt-1 text-[1.55rem] font-black leading-tight tracking-tight">
            {module.title}
          </h1>
          <p className="mt-2 text-xs font-bold leading-6 text-sky-50/80">{module.subtitle}</p>
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

function ModuleView({ module, onUnavailable }: { module: MobileModule; onUnavailable: () => void }) {
  if (module.id === "services") return <ServicesView onUnavailable={onUnavailable} />;

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
      <section className="rounded-[1.8rem] bg-gradient-to-br from-[#064967] to-[#075f7a] p-4 text-white shadow-[0_10px_24px_rgba(6,73,103,0.16)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black text-sky-100">{module.title}</p>
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
        href={module.route ?? "/mobile/counselor"}
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
  userName,
}: {
  initialSection?: string;
  initialAction?: string;
  userName?: string;
}) {
  const section = getSection(initialSection);
  const activeModule = getModule(section);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const onUnavailable = () => setFeedbackOpen(true);

  return (
    <MobileAppShell
      activeSection={section}
      disabledSections={["reports", "assessment-center"]}
      onUnavailable={onUnavailable}
    >
      {section === "home" ? <HomeView userName={userName} onUnavailable={onUnavailable} /> : null}
      {section !== "home" && activeModule && !initialAction ? <ModuleView module={activeModule} onUnavailable={onUnavailable} /> : null}
      {section !== "home" && activeModule && initialAction ? (
        <ActionRouteView module={activeModule} actionId={initialAction} />
      ) : null}
      <MobilePopCard
        open={feedbackOpen}
        title={unavailableTitle}
        description={unavailableDescription}
        onClose={() => setFeedbackOpen(false)}
      />
    </MobileAppShell>
  );
}
