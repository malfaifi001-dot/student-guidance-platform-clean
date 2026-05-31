import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  GraduationCap,
  HeartHandshake,
  MessageCircle,
  School,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserRound,
  Users,
  WandSparkles,
} from "lucide-react";

type SoftBlueDashboardProps = {
  user: {
    name?: string | null;
    officialName?: string | null;
    gender?: string | null;
    jobTitle?: string | null;
    onboardingCompleted?: boolean | null;
    schoolAccount?: {
      name?: string | null;
      profile?: {
        schoolName?: string | null;
        educationDepartment?: string | null;
        academicYear?: string | null;
        currentSemester?: string | null;
        logoUrl?: string | null;
      } | null;
    } | null;
  };
  stats: {
    students: number;
    cases: number;
    reports: number;
    evidences: number;
  };
};

const services = [
  {
    title: "متابعة الطلاب",
    description: "تابع الطالب من أول ملاحظة حتى الإجراء والتقرير.",
    href: "/dashboard/student-follow-up",
    image: "/uploads/VD/1.png",
    icon: UserRound,
    tone: "bg-cyan-50 text-cyan-600",
  },
  {
    title: "التواصل بين الأسرة والمدرسة",
    description: "وثّق التواصل مع الأسرة واربطه بالحالة والنتائج.",
    href: "/dashboard/family-school-communication",
    image: "/uploads/VD/2.png",
    icon: MessageCircle,
    tone: "bg-violet-50 text-violet-600",
  },
  {
    title: "اللجان والاجتماعات",
    description: "محاضر، توصيات، وشواهد مرتبة في مسار واحد.",
    href: "/dashboard/committees-meetings",
    image: "/uploads/VD/3.png",
    icon: Users,
    tone: "bg-blue-50 text-blue-600",
  },
  {
    title: "البرامج الإرشادية",
    description: "نفّذ برنامجًا إرشاديًا وحوّله لتقرير رسمي.",
    href: "/dashboard/guidance-programs",
    image: "/uploads/VD/8.png",
    icon: HeartHandshake,
    tone: "bg-emerald-50 text-emerald-600",
  },
];

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

function getTheme(gender?: string | null) {
  const female = gender === "FEMALE";

  return {
    female,
    character: female ? "/uploads/VD/girl.png" : "/uploads/VD/boy.png",
    assistantName: female ? "رَاشِدَة" : "رَاشِد",
    roleLabel: female ? "موجهة طلابية" : "موجه طلابي",
    mainText: female ? "text-rose-700" : "text-sky-700",
    softText: female ? "text-rose-600" : "text-sky-600",
    softBg: female ? "bg-rose-50" : "bg-sky-50",
    softBorder: female ? "border-rose-100" : "border-sky-100",
    button:
      female
        ? "bg-rose-500 hover:bg-rose-600 shadow-rose-100"
        : "bg-sky-600 hover:bg-sky-700 shadow-sky-100",
    outline:
      female
        ? "border-rose-100 text-rose-700 hover:bg-rose-50"
        : "border-sky-100 text-sky-700 hover:bg-sky-50",
    hero:
      female
        ? "from-rose-50 via-white to-fuchsia-50"
        : "from-sky-50 via-white to-blue-50",
    assistant:
      female
        ? "from-rose-500 to-fuchsia-500"
        : "from-sky-600 to-cyan-500",
    progress:
      female
        ? "from-rose-300 to-fuchsia-500"
        : "from-cyan-300 to-blue-500",
  };
}

function getIdentityScore(user: SoftBlueDashboardProps["user"]) {
  const profile = user.schoolAccount?.profile;

  const checks = [
    user.officialName,
    user.jobTitle,
    profile?.schoolName,
    profile?.educationDepartment,
    profile?.academicYear,
    profile?.currentSemester,
    profile?.logoUrl,
  ];

  return Math.round(
    (checks.filter((item) => Boolean(String(item || "").trim())).length /
      checks.length) *
      100
  );
}

export function SoftBlueDashboard({ user, stats }: SoftBlueDashboardProps) {
  const theme = getTheme(user.gender);
  const profile = user.schoolAccount?.profile;

  const displayName = user.officialName || user.name || "الموجه/الموجهة";
  const schoolName =
    profile?.schoolName || user.schoolAccount?.name || "منصة التوجيه الطلابي";
  const jobTitle = user.jobTitle || theme.roleLabel;
  const identityScore = getIdentityScore(user);
  const greeting = getRiyadhGreeting();

  const todayFocus = [
    {
      title: "حالات تحتاج متابعة",
      value: stats.cases,
      description:
        stats.cases > 0
          ? "ابدأ بالحالات التي لم تُحدّث مؤخرًا."
          : "لا توجد حالات نشطة حاليًا.",
      href: "/dashboard/cases",
      icon: Activity,
      tone: "bg-cyan-50 text-cyan-600",
    },
    {
      title: "تقارير تحتاج مراجعة",
      value: stats.reports,
      description:
        stats.reports > 0
          ? "راجع المسودات قبل الاعتماد والتصدير."
          : "لا توجد تقارير محفوظة بعد.",
      href: "/dashboard/reports",
      icon: FileText,
      tone: "bg-violet-50 text-violet-600",
    },
    {
      title: "جاهزية الهوية",
      value: identityScore,
      suffix: "%",
      description:
        identityScore >= 90
          ? "هوية المدرسة جاهزة للتقارير الرسمية."
          : "أكمل بيانات المدرسة والشعار لتحسين التقارير.",
      href: "/dashboard/settings/school",
      icon: School,
      tone: "bg-amber-50 text-amber-700",
    },
  ];

  return (
    <main className="space-y-5 text-slate-900">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_315px]">
        <div className="space-y-5">
          <section
            className={[
              "relative overflow-hidden rounded-[1.7rem] border bg-gradient-to-br px-5 py-4 shadow-sm",
              theme.softBorder,
              theme.hero,
            ].join(" ")}
          >
            <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-white/60 blur-3xl" />
            <div className="absolute bottom-2 left-28 h-20 w-20 rounded-full bg-cyan-100/60 blur-2xl" />

            <div className="relative z-10 grid items-center gap-4 lg:grid-cols-[1fr_150px]">
              <div>
                <div
                  className={[
                    "inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[12px] font-black shadow-sm",
                    theme.softText,
                  ].join(" ")}
                >
                  <Sparkles className="h-4 w-4" />
                  مركز قيادة اليوم
                </div>

                <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
                  <h1
                    className={[
                      "text-2xl font-black tracking-tight md:text-3xl",
                      theme.mainText,
                    ].join(" ")}
                  >
                    {greeting}
                  </h1>

                  <p className="text-xl font-black text-slate-950 md:text-2xl">
                    {displayName}
                  </p>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-bold text-slate-600">
                  <span>{jobTitle}</span>
                  <span className="text-slate-300">•</span>
                  <span>{schoolName}</span>
                </div>

                <p
                  className={[
                    "mt-3 inline-flex rounded-2xl border bg-white/75 px-3 py-2 text-[13px] font-bold leading-6 shadow-sm",
                    theme.softBorder,
                    theme.softText,
                  ].join(" ")}
                >
                  {theme.female
                    ? "رسالتك اليوم: كل متابعة صغيرة تصنع فرقًا كبيرًا في حياة طالبة."
                    : "رسالتك اليوم: كل متابعة صغيرة تصنع فرقًا كبيرًا في حياة طالب."}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="/dashboard/cases"
                    className={[
                      "rounded-2xl px-4 py-2.5 text-[13px] font-black text-white shadow-lg transition",
                      theme.button,
                    ].join(" ")}
                  >
                    ابدأ المتابعة
                  </Link>

                  <Link
                    href="/dashboard/reports"
                    className={[
                      "rounded-2xl border bg-white px-4 py-2.5 text-[13px] font-black transition",
                      theme.outline,
                    ].join(" ")}
                  >
                    تقرير جديد
                  </Link>

                  <Link
                    href="/dashboard/student-import"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-black text-slate-700 transition hover:bg-slate-50"
                  >
                    رفع بيانات نور
                  </Link>
                </div>
              </div>

              <div className="mx-auto h-28 w-28 overflow-hidden rounded-[1.5rem] bg-white/65 shadow-sm lg:mx-0">
                <img
                  src={theme.character}
                  alt={displayName}
                  className="h-full w-full object-contain object-bottom p-1"
                />
              </div>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            {todayFocus.map((item) => {
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

                  <div className="mt-3 flex items-end gap-1">
                    <p className="text-3xl font-black text-slate-950">
                      {item.value}
                    </p>
                    {item.suffix ? (
                      <span className="pb-1 text-sm font-black text-slate-400">
                        {item.suffix}
                      </span>
                    ) : null}
                  </div>

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
            <MetricCard
              title="الطلاب"
              value={stats.students}
              icon={<GraduationCap className="h-5 w-5" />}
              href="/dashboard/students"
            />
            <MetricCard
              title="الحالات"
              value={stats.cases}
              icon={<ClipboardCheck className="h-5 w-5" />}
              href="/dashboard/cases"
            />
            <MetricCard
              title="التقارير"
              value={stats.reports}
              icon={<BookOpenCheck className="h-5 w-5" />}
              href="/dashboard/reports"
            />
            <MetricCard
              title="الشواهد"
              value={stats.evidences}
              icon={<CalendarDays className="h-5 w-5" />}
              href="/dashboard/cases"
            />
          </section>

          <section className="rounded-[1.45rem] border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  الخدمات اليومية
                </h2>
                <p className="mt-1 text-[12px] font-bold text-slate-400">
                  المسارات الأكثر ارتباطًا بعمل الموجه/الموجهة
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {services.map((service) => {
                const Icon = service.icon;

                return (
                  <Link
                    key={service.href}
                    href={service.href}
                    className="group overflow-hidden rounded-[1.35rem] border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="relative h-24 overflow-hidden bg-slate-50">
                      <img
                        src={service.image}
                        alt={service.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/20 to-transparent" />
                      <div
                        className={[
                          "absolute bottom-2 left-2 grid h-10 w-10 place-items-center rounded-2xl border border-white/80 shadow-sm backdrop-blur",
                          service.tone,
                        ].join(" ")}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="p-3">
                      <h3 className="text-[15px] font-black text-slate-900">
                        {service.title}
                      </h3>
                      <p className="mt-1.5 min-h-[40px] text-[13px] font-bold leading-6 text-slate-500">
                        {service.description}
                      </p>
                      <span
                        className={[
                          "mt-2 inline-flex items-center gap-1 text-[13px] font-black",
                          theme.softText,
                        ].join(" ")}
                      >
                        الدخول
                        <ArrowLeft className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <AssistantCard
            theme={theme}
            displayName={displayName}
            identityScore={identityScore}
          />

          <section className="rounded-[1.45rem] border border-slate-100 bg-white p-4 shadow-sm">
            <SectionTitle title="اقتراحات الآن" subtitle="ما يستحق انتباهك أولًا" />

            <div className="mt-4 space-y-2">
              <ActionLine
                icon={<Activity className="h-5 w-5" />}
                title="راجع الحالات المفتوحة"
                subtitle="ابدأ بالحالات التي لم يتم تحديثها مؤخرًا."
                href="/dashboard/cases"
              />
              <ActionLine
                icon={<FileText className="h-5 w-5" />}
                title="اعتمد تقريرًا جاهزًا"
                subtitle="راجع التقرير قبل الطباعة أو PDF."
                href="/dashboard/reports"
              />
              <ActionLine
                icon={<UploadCloud className="h-5 w-5" />}
                title="حدّث بيانات الطلاب"
                subtitle="ارفع ملف نور إذا بدأت فترة جديدة."
                href="/dashboard/student-import"
              />
            </div>
          </section>

          <section className="rounded-[1.45rem] border border-slate-100 bg-white p-4 shadow-sm">
            <SectionTitle title="آخر التقارير" subtitle="مختصر سريع" />

            <div className="mt-4 space-y-2">
              <ReportLine title="تقرير متابعة طالب" status="جاهز للمراجعة" />
              <ReportLine title="تقرير التواصل مع الأسرة" status="مسودة" />
              <ReportLine title="تقرير اللجان والاجتماعات" status="مكتمل" />
            </div>

            <Link
              href="/dashboard/reports"
              className={[
                "mt-4 flex h-10 items-center justify-center rounded-2xl text-[13px] font-black transition",
                theme.softBg,
                theme.softText,
              ].join(" ")}
            >
              عرض جميع التقارير
            </Link>
          </section>
        </aside>
      </section>
    </main>
  );
}

function AssistantCard({
  theme,
  displayName,
  identityScore,
}: {
  theme: ReturnType<typeof getTheme>;
  displayName: string;
  identityScore: number;
}) {
  return (
    <section
      className={[
        "relative overflow-hidden rounded-[1.45rem] bg-gradient-to-br p-5 text-white shadow-sm",
        theme.assistant,
      ].join(" ")}
    >
      <div className="absolute -left-14 -top-14 h-36 w-36 rounded-full bg-white/20 blur-2xl" />
      <div className="absolute -bottom-16 right-10 h-40 w-40 rounded-full bg-slate-950/20 blur-2xl" />

      <div className="relative z-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
          <WandSparkles className="h-6 w-6" />
        </div>

        <h2 className="mt-4 text-2xl font-black">
          {theme.assistantName} معك اليوم
        </h2>

        <p className="mt-3 text-[13px] font-bold leading-7 text-white/90">
          {displayName}، لا تبدأ من الصفر. افتح الحالات، راجع التقارير، ورتّب
          الشواهد قبل التصدير.
        </p>

        <div className="mt-4 rounded-2xl bg-white/15 p-3 backdrop-blur">
          <div className="flex items-center justify-between text-[12px] font-black">
            <span>جاهزية الهوية الرسمية</span>
            <span>{identityScore}%</span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${identityScore}%` }}
            />
          </div>
        </div>

        <Link
          href="/dashboard/settings/school"
          className="mt-4 inline-flex rounded-2xl bg-white px-4 py-2.5 text-[13px] font-black text-slate-950 transition hover:bg-slate-50"
        >
          تحسين الهوية
        </Link>
      </div>
    </section>
  );
}

function MetricCard({
  title,
  value,
  icon,
  href,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-[1.3rem] border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div>
        <p className="text-[13px] font-black text-slate-500">{title}</p>
        <p className="mt-1 text-3xl font-black text-slate-950">{value}</p>
      </div>

      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-50 text-sky-600">
        {icon}
      </div>
    </Link>
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

function ActionLine({
  icon,
  title,
  subtitle,
  href,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex gap-3 rounded-2xl bg-slate-50 p-3 transition hover:bg-white hover:shadow-sm"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-sky-600 shadow-sm">
        {icon}
      </div>

      <div>
        <p className="text-[14px] font-black text-slate-900">{title}</p>
        <p className="mt-1 text-[12px] font-bold leading-5 text-slate-500">
          {subtitle}
        </p>
      </div>
    </Link>
  );
}

function ReportLine({ title, status }: { title: string; status: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-sky-600 shadow-sm">
        <FileText className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-black text-slate-900">
          {title}
        </p>
        <p className="mt-1 text-[12px] font-bold text-slate-500">{status}</p>
      </div>

      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
    </div>
  );
}
