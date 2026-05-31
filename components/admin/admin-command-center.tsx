import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  ClipboardList,
  Database,
  FileText,
  GitBranch,
  Layers3,
  LayoutDashboard,
  LockKeyhole,
  Rocket,
  School,
  Settings,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users,
  WandSparkles,
} from "lucide-react";

type AdminCommandCenterProps = {
  adminName: string;
  stats: {
    schools: number;
    users: number;
    activeUsers: number;
    students: number;
    services: number;
    workflows: number;
    publishedWorkflows: number;
    draftWorkflows: number;
    reports: number;
    reportTemplates: number;
    draftReportTemplates: number;
    activeSessions: number;
    incompleteSchoolProfiles: number;
  };
};

const adminActions = [
  {
    title: "إدارة Workflows",
    description: "اعتمد النماذج قبل أن تظهر للموجهين.",
    href: "/dashboard/admin/workflows",
    icon: GitBranch,
    badge: "Runtime",
    tone: "bg-sky-50 text-sky-700",
  },
  {
    title: "قوالب التقارير",
    description: "راقب القوالب الرسمية والمسودات والنشر.",
    href: "/dashboard/admin/report-templates",
    icon: FileText,
    badge: "Reports",
    tone: "bg-violet-50 text-violet-700",
  },
  {
    title: "مصمم Workflow",
    description: "بناء وتعديل خطوات وحقول الخدمات.",
    href: "/dashboard/admin/workflow-builder",
    icon: Layers3,
    badge: "Builder",
    tone: "bg-cyan-50 text-cyan-700",
  },
  {
    title: "إنشاء قالب تقرير",
    description: "ابدأ قالبًا رسميًا جديدًا من الصفر.",
    href: "/dashboard/admin/report-templates/new",
    icon: BookOpenCheck,
    badge: "New",
    tone: "bg-emerald-50 text-emerald-700",
  },
];

const systemPillars = [
  {
    title: "الهوية الرسمية",
    description: "تأكد أن المدارس أكملت بياناتها وشعاراتها قبل التقارير.",
    icon: School,
  },
  {
    title: "سلامة Workflows",
    description: "لا تنشر Workflow إلا بعد المعاينة والتحقق.",
    icon: ShieldCheck,
  },
  {
    title: "جودة التقارير",
    description: "القوالب الرسمية تحفظ شكل المنصة ومخرجاتها.",
    icon: FileText,
  },
];

function getAdminGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Asia/Riyadh",
    }).format(new Date())
  );

  if (hour >= 5 && hour < 12) return "صباح القيادة";
  if (hour >= 12 && hour < 17) return "مساء الإنجاز";
  if (hour >= 17 && hour < 22) return "مساء السيطرة";

  return "أهلًا بك";
}

function calculateControlScore(stats: AdminCommandCenterProps["stats"]) {
  const workflowScore =
    stats.workflows === 0
      ? 35
      : Math.round((stats.publishedWorkflows / Math.max(stats.workflows, 1)) * 35);

  const templateScore =
    stats.reportTemplates === 0
      ? 20
      : Math.round(
          ((stats.reportTemplates - stats.draftReportTemplates) /
            Math.max(stats.reportTemplates, 1)) *
            25
        );

  const identityPenalty = Math.min(stats.incompleteSchoolProfiles * 5, 25);
  const identityScore = Math.max(25 - identityPenalty, 0);

  const base = 15;

  return Math.min(workflowScore + templateScore + identityScore + base, 100);
}

export function AdminCommandCenter({
  adminName,
  stats,
}: AdminCommandCenterProps) {
  const greeting = getAdminGreeting();
  const controlScore = calculateControlScore(stats);

  const urgentItems = [
    {
      title: "Workflows كمسودة",
      value: stats.draftWorkflows,
      description:
        stats.draftWorkflows > 0
          ? "راجع المسودات وانشر الجاهز منها."
          : "لا توجد Workflows معلقة.",
      href: "/dashboard/admin/workflows",
      icon: GitBranch,
      tone:
        stats.draftWorkflows > 0
          ? "bg-amber-50 text-amber-700"
          : "bg-emerald-50 text-emerald-700",
    },
    {
      title: "قوالب تقارير غير منشورة",
      value: stats.draftReportTemplates,
      description:
        stats.draftReportTemplates > 0
          ? "راجع القوالب قبل إتاحتها للموجهين."
          : "القوالب تبدو مستقرة.",
      href: "/dashboard/admin/report-templates",
      icon: FileText,
      tone:
        stats.draftReportTemplates > 0
          ? "bg-amber-50 text-amber-700"
          : "bg-emerald-50 text-emerald-700",
    },
    {
      title: "هويات مدارس ناقصة",
      value: stats.incompleteSchoolProfiles,
      description:
        stats.incompleteSchoolProfiles > 0
          ? "بعض المدارس تحتاج إكمال الهوية الرسمية."
          : "هويات المدارس مكتملة.",
      href: "/dashboard/settings/school",
      icon: School,
      tone:
        stats.incompleteSchoolProfiles > 0
          ? "bg-rose-50 text-rose-700"
          : "bg-emerald-50 text-emerald-700",
    },
  ];

  return (
    <main className="space-y-5 text-slate-900" dir="rtl">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <section className="relative overflow-hidden rounded-[1.7rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-blue-50 px-5 py-4 shadow-sm">
            <div className="absolute -left-16 -top-16 h-52 w-52 rounded-full bg-sky-100/70 blur-3xl" />
            <div className="absolute bottom-4 left-32 h-24 w-24 rounded-full bg-cyan-100/70 blur-2xl" />

            <div className="relative z-10 grid gap-4 lg:grid-cols-[1fr_180px]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-[12px] font-black text-sky-700 shadow-sm">
                  <Sparkles className="h-4 w-4" />
                  Admin Command Center
                </div>

                <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
                  <h1 className="text-2xl font-black tracking-tight text-sky-700 md:text-3xl">
                    {greeting}
                  </h1>

                  <p className="text-xl font-black text-slate-950 md:text-2xl">
                    {adminName}
                  </p>
                </div>

                <p className="mt-3 max-w-3xl text-[14px] font-bold leading-7 text-slate-600">
                  هذه ليست صفحة روابط، بل مركز سيطرة: راقب المدارس، المستخدمين،
                  النماذج، القوالب، والجلسات من مكان واحد.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <AdminHeroButton href="/dashboard/admin/workflows">
                    مراجعة Workflows
                  </AdminHeroButton>

                  <AdminHeroButton href="/dashboard/admin/report-templates" outline>
                    قوالب التقارير
                  </AdminHeroButton>

                  <AdminHeroButton href="/dashboard/settings/school" quiet>
                    إعدادات الهوية
                  </AdminHeroButton>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-sky-100 bg-white/80 p-4 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                  <LayoutDashboard className="h-6 w-6" />
                </div>

                <p className="mt-4 text-[12px] font-black text-slate-400">
                  درجة السيطرة العامة
                </p>

                <div className="mt-2 flex items-end gap-1">
                  <p className="text-4xl font-black text-slate-950">
                    {controlScore}
                  </p>
                  <span className="pb-1 text-sm font-black text-slate-400">
                    %
                  </span>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-cyan-300 to-blue-500"
                    style={{ width: `${controlScore}%` }}
                  />
                </div>

                <p className="mt-3 text-[12px] font-bold leading-6 text-slate-500">
                  ترتفع الدرجة كلما قلت المسودات واكتملت الهويات واستقرت النماذج.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            {urgentItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group rounded-[1.4rem] border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={[
                        "grid h-11 w-11 place-items-center rounded-2xl",
                        item.tone,
                      ].join(" ")}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <ArrowLeft className="h-5 w-5 text-slate-300 transition group-hover:-translate-x-1 group-hover:text-sky-600" />
                  </div>

                  <p className="mt-3 text-3xl font-black text-slate-950">
                    {item.value}
                  </p>

                  <h2 className="mt-2 text-[15px] font-black text-slate-900">
                    {item.title}
                  </h2>

                  <p className="mt-1 text-[13px] font-bold leading-6 text-slate-500">
                    {item.description}
                  </p>
                </Link>
              );
            })}
          </section>

          <section className="grid gap-3 md:grid-cols-4">
            <MetricCard title="المدارس" value={stats.schools} icon={<Building2 className="h-5 w-5" />} />
            <MetricCard title="المستخدمون" value={stats.users} icon={<Users className="h-5 w-5" />} />
            <MetricCard title="الطلاب" value={stats.students} icon={<GraduationCapIcon />} />
            <MetricCard title="الجلسات النشطة" value={stats.activeSessions} icon={<Activity className="h-5 w-5" />} />
          </section>

          <section className="rounded-[1.45rem] border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  أدوات السيطرة الأساسية
                </h2>
                <p className="mt-1 text-[12px] font-bold text-slate-400">
                  أهم ما يحتاجه الأدمن لإدارة منصة كبيرة بدون ضياع
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {adminActions.map((action) => {
                const Icon = action.icon;

                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group rounded-[1.35rem] border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={[
                          "grid h-11 w-11 place-items-center rounded-2xl",
                          action.tone,
                        ].join(" ")}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-500">
                        {action.badge}
                      </span>
                    </div>

                    <h3 className="mt-4 text-[15px] font-black text-slate-950">
                      {action.title}
                    </h3>

                    <p className="mt-2 min-h-[42px] text-[13px] font-bold leading-6 text-slate-500">
                      {action.description}
                    </p>

                    <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-black text-sky-600">
                      فتح الأداة
                      <ArrowLeft className="h-4 w-4" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <AdminAssistantCard stats={stats} controlScore={controlScore} />

          <section className="rounded-[1.45rem] border border-slate-100 bg-white p-4 shadow-sm">
            <SectionTitle title="مؤشرات التشغيل" subtitle="مختصر صحة المنصة" />

            <div className="mt-4 space-y-3">
              <HealthLine
                label="Workflows المنشورة"
                value={`${stats.publishedWorkflows}/${stats.workflows}`}
                ok={stats.draftWorkflows === 0}
              />
              <HealthLine
                label="قوالب التقارير"
                value={`${stats.reportTemplates}`}
                ok={stats.draftReportTemplates === 0}
              />
              <HealthLine
                label="هويات المدارس"
                value={
                  stats.incompleteSchoolProfiles > 0
                    ? `${stats.incompleteSchoolProfiles} ناقصة`
                    : "مكتملة"
                }
                ok={stats.incompleteSchoolProfiles === 0}
              />
              <HealthLine
                label="المستخدمون النشطون"
                value={`${stats.activeUsers}`}
                ok={stats.activeUsers > 0}
              />
            </div>
          </section>

          <section className="rounded-[1.45rem] border border-slate-100 bg-white p-4 shadow-sm">
            <SectionTitle title="مبادئ الإدارة" subtitle="قاعدة التشغيل اليومي" />

            <div className="mt-4 space-y-3">
              {systemPillars.map((pillar) => {
                const Icon = pillar.icon;

                return (
                  <div
                    key={pillar.title}
                    className="flex gap-3 rounded-2xl bg-slate-50 p-3"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-sky-600 shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-[14px] font-black text-slate-900">
                        {pillar.title}
                      </p>
                      <p className="mt-1 text-[12px] font-bold leading-5 text-slate-500">
                        {pillar.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[1.45rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-4 shadow-sm">
            <div className="flex gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-sky-600 shadow-sm">
                <LockKeyhole className="h-5 w-5" />
              </div>

              <div>
                <p className="text-[15px] font-black text-slate-950">
                  تذكير أمني
                </p>
                <p className="mt-1 text-[12px] font-bold leading-6 text-slate-500">
                  الحسابات مرتبطة بتقارير وهويات رسمية؛ راقب الجلسات والتفعيل
                  قبل الإطلاق.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

function AdminAssistantCard({
  stats,
  controlScore,
}: {
  stats: AdminCommandCenterProps["stats"];
  controlScore: number;
}) {
  const advice =
    stats.draftWorkflows > 0
      ? "ابدأ بمراجعة Workflows المسودة قبل أي تطوير جديد."
      : stats.draftReportTemplates > 0
        ? "راجع قوالب التقارير غير المنشورة حتى لا تتعطل تجربة الموجهين."
        : stats.incompleteSchoolProfiles > 0
          ? "وجّه المدارس لإكمال الهوية الرسمية قبل إصدار التقارير."
          : "المنصة تبدو مستقرة. يمكنك الآن التركيز على التوسع وتحسين التجربة.";

  return (
    <section className="relative overflow-hidden rounded-[1.45rem] bg-gradient-to-br from-slate-950 to-sky-700 p-5 text-white shadow-sm">
      <div className="absolute -left-14 -top-14 h-40 w-40 rounded-full bg-sky-400/25 blur-2xl" />
      <div className="absolute -bottom-16 right-10 h-44 w-44 rounded-full bg-cyan-400/20 blur-2xl" />

      <div className="relative z-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
          <WandSparkles className="h-6 w-6" />
        </div>

        <h2 className="mt-4 text-2xl font-black">مساعد الأدمن</h2>

        <p className="mt-3 text-[13px] font-bold leading-7 text-white/90">
          {advice}
        </p>

        <div className="mt-4 rounded-2xl bg-white/15 p-3 backdrop-blur">
          <div className="flex items-center justify-between text-[12px] font-black">
            <span>استقرار المنصة</span>
            <span>{controlScore}%</span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${controlScore}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function AdminHeroButton({
  href,
  children,
  outline,
  quiet,
}: {
  href: string;
  children: ReactNode;
  outline?: boolean;
  quiet?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "rounded-2xl px-4 py-2.5 text-[13px] font-black transition",
        outline
          ? "border border-sky-100 bg-white text-sky-700 hover:bg-sky-50"
          : quiet
            ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            : "bg-sky-600 text-white shadow-lg shadow-sky-100 hover:bg-sky-700",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <article className="flex items-center justify-between rounded-[1.3rem] border border-slate-100 bg-white p-4 shadow-sm">
      <div>
        <p className="text-[13px] font-black text-slate-500">{title}</p>
        <p className="mt-1 text-3xl font-black text-slate-950">{value}</p>
      </div>

      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-50 text-sky-600">
        {icon}
      </div>
    </article>
  );
}

function HealthLine({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
      <div className="flex items-center gap-2">
        {ok ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-amber-500" />
        )}
        <p className="text-[13px] font-black text-slate-700">{label}</p>
      </div>

      <p
        className={[
          "rounded-full px-3 py-1 text-[12px] font-black",
          ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-xl font-black text-slate-900">{title}</h2>
      <p className="mt-1 text-[12px] font-bold text-slate-400">{subtitle}</p>
    </div>
  );
}

function GraduationCapIcon() {
  return <Users className="h-5 w-5" />;
}
