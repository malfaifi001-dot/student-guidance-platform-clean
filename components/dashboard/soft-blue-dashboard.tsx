import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  FileText,
  GraduationCap,
  MessageCircle,
  MoreHorizontal,
  Plus,
  School,
  Search,
  Sparkles,
  UploadCloud,
  UserRound,
  Users,
} from "lucide-react";

type SoftBlueDashboardProps = {
  user: {
    name?: string | null;
    officialName?: string | null;
    gender?: string | null;
    jobTitle?: string | null;
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

const serviceCards = [
  {
    title: "متابعة الطلاب",
    description:
      "متابعة الحالة الأكاديمية والسلوكية للطلاب وتقديم الدعم والإرشاد المناسب.",
    image: "/uploads/VD/1.png",
    href: "/dashboard/student-follow-up",
    icon: UserRound,
    tone: "bg-cyan-50 text-cyan-600",
  },
  {
    title: "التواصل بين الأسرة والمدرسة",
    description:
      "تعزيز التواصل مع أولياء الأمور وتوثيق ما تم مناقشته ونتائج التواصل.",
    image: "/uploads/VD/2.png",
    href: "/dashboard/family-school-communication",
    icon: MessageCircle,
    tone: "bg-violet-50 text-violet-600",
  },
  {
    title: "اللجان والاجتماعات",
    description:
      "تنظيم اللجان والاجتماعات الطلابية ومتابعة القرارات والتوصيات.",
    image: "/uploads/VD/3.png",
    href: "/dashboard/committees-meetings",
    icon: Users,
    tone: "bg-blue-50 text-blue-600",
  },
];

const activityItems = [
  {
    title: "تم تحديث حالة طالب",
    subtitle: "متابعة الطلاب",
    time: "منذ 15 دقيقة",
    icon: Users,
    tone: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "تمت إضافة تقرير جديد",
    subtitle: "تقرير إرشادي رسمي",
    time: "منذ ساعة",
    icon: FileText,
    tone: "bg-violet-50 text-violet-600",
  },
  {
    title: "تم ترتيب شواهد تقرير",
    subtitle: "الشواهد والمرفقات",
    time: "منذ 3 ساعات",
    icon: ClipboardCheck,
    tone: "bg-sky-50 text-sky-600",
  },
  {
    title: "تم رفع بيانات طلاب",
    subtitle: "بيانات نور",
    time: "منذ يوم",
    icon: UploadCloud,
    tone: "bg-cyan-50 text-cyan-600",
  },
];

const reportItems = [
  {
    title: "تقرير متابعة طالب",
    period: "جاهز للمراجعة",
    date: "اليوم",
    tone: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "تقرير التواصل مع الأسرة",
    period: "مسودة",
    date: "هذا الأسبوع",
    tone: "bg-violet-50 text-violet-600",
  },
  {
    title: "تقرير اللجان والاجتماعات",
    period: "مكتمل",
    date: "هذا الشهر",
    tone: "bg-sky-50 text-sky-600",
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

function getDashboardTheme(gender?: string | null) {
  const isFemale = gender === "FEMALE";

  if (isFemale) {
    return {
      heroGradient: "from-rose-50 via-white to-fuchsia-50",
      heroBorder: "border-rose-100",
      primaryText: "text-rose-700",
      primaryButton: "bg-rose-500 hover:bg-rose-600 shadow-rose-100",
      secondaryButton:
        "border-rose-100 bg-white text-rose-700 hover:bg-rose-50",
      badge: "bg-white/80 text-rose-600",
      icon: "text-rose-500",
      focus:
        "focus:border-rose-200 focus:ring-4 focus:ring-rose-50",
      serviceLink: "text-rose-600 hover:text-rose-700",
      reminderGradient: "from-rose-50 via-white to-fuchsia-50",
      reminderText: "text-rose-700",
      reminderButton: "text-rose-700 hover:bg-rose-50",
      marketingGradient: "from-rose-500 to-fuchsia-500",
      quickIcon: "text-rose-600",
      quickHover: "group-hover:text-rose-600",
      progress: "from-rose-300 to-fuchsia-500",
      avatarFallback: "/uploads/VD/girl.png",
      label: "موجهة طلابية",
    };
  }

  return {
    heroGradient: "from-sky-50 via-white to-blue-50",
    heroBorder: "border-sky-100",
    primaryText: "${theme.reminderText}",
    primaryButton: "bg-sky-600 hover:bg-sky-700 shadow-sky-100",
    secondaryButton:
      "border-sky-100 bg-white text-sky-700 hover:bg-sky-50",
    badge: "bg-white/80 text-sky-600",
    icon: "${theme.icon}",
    focus:
      "${theme.focus}",
    serviceLink: "${theme.serviceLink}",
    reminderGradient: "from-cyan-50 via-white to-blue-50",
    reminderText: "text-sky-700",
    reminderButton: "text-sky-700 hover:bg-sky-50",
    marketingGradient: "from-sky-600 to-cyan-500",
    quickIcon: "text-sky-600",
    quickHover: "group-hover:text-sky-600",
    progress: "from-cyan-300 to-blue-500",
    avatarFallback: "/uploads/VD/boy.png",
    label: "موجه طلابي",
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
  const profile = user.schoolAccount?.profile;
  const theme = getDashboardTheme(user.gender);
  const displayName = user.officialName || user.name || "الموجه/الموجهة";
  const jobTitle =
    user.jobTitle || theme.label;
  const schoolName =
    profile?.schoolName || user.schoolAccount?.name || "منصة التوجيه الطلابي";
  const greeting = getRiyadhGreeting();
  const identityScore = getIdentityScore(user);
  const counselorImage = theme.avatarFallback;

  return (
    <main className="space-y-6 text-slate-900">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-5">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="ابحث عن طالب، خدمة، حالة أو تقرير..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-12 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-200 focus:ring-4 focus:ring-sky-50"
            />
          </div>

          <section className="relative overflow-hidden rounded-[2rem] border ${theme.heroBorder} bg-gradient-to-br ${theme.heroGradient} px-6 py-7 shadow-sm md:px-10">
            <div className="absolute inset-0 opacity-80">
              <div className="absolute -right-20 top-12 h-64 w-64 rounded-full border border-sky-100" />
              <div className="absolute -left-24 -top-20 h-72 w-72 rounded-full bg-sky-100/45 blur-3xl" />
              <div className="absolute bottom-10 left-32 h-28 w-28 rounded-full bg-cyan-100/60 blur-2xl" />
            </div>

            <div className="relative grid items-center gap-6 lg:grid-cols-[1fr_280px]">
              <div className="text-center lg:text-right">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black ${theme.badge} shadow-sm">
                  <Sparkles className="h-4 w-4" />
                  لوحة اليوم
                </div>

                <h1 className="text-3xl font-black tracking-tight ${theme.primaryText} md:text-5xl">
                  {greeting}
                </h1>

                <p className="mt-3 text-2xl font-black text-slate-900 md:text-3xl">
                  {displayName}
                </p>

                <div className="mt-5 grid gap-2 text-sm font-bold text-slate-600 sm:inline-grid">
                  <div className="flex items-center justify-center gap-2 lg:justify-start">
                    <BriefcaseBusiness className="h-4 w-4 ${theme.icon}" />
                    <span>المسمى: {jobTitle}</span>
                  </div>

                  <div className="flex items-center justify-center gap-2 lg:justify-start">
                    <School className="h-4 w-4 ${theme.icon}" />
                    <span>المدرسة: {schoolName}</span>
                  </div>
                </div>

                {user.gender === "FEMALE" ? (
                  <div className="mt-5 inline-flex rounded-2xl border border-rose-100 bg-white/70 px-4 py-3 text-sm font-bold leading-7 text-rose-700 shadow-sm">
                    رسالتك اليوم: كل متابعة صغيرة تصنع فرقًا كبيرًا في حياة طالبة.
                  </div>
                ) : (
                  <div className="mt-5 inline-flex rounded-2xl border border-sky-100 bg-white/70 px-4 py-3 text-sm font-bold leading-7 text-sky-700 shadow-sm">
                    رسالتك اليوم: كل متابعة صغيرة تصنع فرقًا كبيرًا في حياة طالب.
                  </div>
                )}

                <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
                  <Link
                    href="/dashboard/reports"
                    className="rounded-2xl px-5 py-3 text-sm font-black text-white shadow-lg transition ${theme.primaryButton}"
                  >
                    إنشاء تقرير
                  </Link>

                  <Link
                    href="/dashboard/student-import"
                    className="rounded-2xl border px-5 py-3 text-sm font-black transition ${theme.secondaryButton}"
                  >
                    رفع بيانات نور
                  </Link>
                </div>
              </div>

              <div className="relative mx-auto h-60 w-60 overflow-hidden rounded-[2rem] bg-white/55 lg:mx-0">
                <img
                  src={counselorImage}
                  alt={displayName}
                  className="h-full w-full object-contain object-bottom p-2"
                />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
            <StatCard
              title="الطلاب المتابعون"
              value={stats.students}
              hint="طلاب جاهزون للخدمات"
              icon={<Users className="h-6 w-6" />}
              tone="bg-blue-50 text-blue-600"
            />
            <StatCard
              title="الحالات النشطة"
              value={stats.cases}
              hint="حالات موثقة ومتابعة"
              icon={<Activity className="h-6 w-6" />}
              tone="bg-cyan-50 text-cyan-600"
            />
            <StatCard
              title="التقارير"
              value={stats.reports}
              hint="تقارير رسمية ومسودات"
              icon={<FileText className="h-6 w-6" />}
              tone="bg-violet-50 text-violet-600"
            />
            <StatCard
              title="الشواهد"
              value={stats.evidences}
              hint="صور وملفات داعمة"
              icon={<CalendarDays className="h-6 w-6" />}
              tone="bg-emerald-50 text-emerald-600"
            />
          </section>

          <section className="rounded-[1.75rem] border border-slate-100 bg-white p-4 shadow-sm md:p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">الخدمات</h2>
                <p className="mt-1 text-xs font-bold text-slate-400">
                  أكثر المسارات استخدامًا للموجه/الموجهة
                </p>
              </div>

              <Link
                href="/dashboard/services"
                className="inline-flex items-center gap-1 text-sm font-black ${theme.serviceLink}"
              >
                عرض جميع الخدمات
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {serviceCards.map((service) => {
                const Icon = service.icon;

                return (
                  <Link
                    key={service.href}
                    href={service.href}
                    className="group overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="relative h-36 overflow-hidden bg-slate-50">
                      <img
                        src={service.image}
                        alt={service.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/10 to-transparent" />
                      <div
                        className={[
                          "absolute bottom-3 left-3 grid h-12 w-12 place-items-center rounded-2xl border border-white/80 shadow-sm backdrop-blur",
                          service.tone,
                        ].join(" ")}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="text-base font-black text-slate-900">
                        {service.title}
                      </h3>
                      <p className="mt-2 min-h-[58px] text-sm leading-7 text-slate-500">
                        {service.description}
                      </p>
                      <span className="mt-3 inline-flex items-center gap-1 text-sm font-black text-sky-600 group-hover:text-sky-700">
                        الدخول إلى الخدمة
                        <ChevronLeft className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
            <MarketingBook />

            <section className="overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    مسارات سريعة
                  </h2>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    ابدأ من المكان الأقرب لعملك
                  </p>
                </div>
              </div>

              <div className="grid gap-3 p-5 md:grid-cols-2">
                <QuickPath
                  title="ابدأ من الطالب"
                  description="اختر الطالب ثم افتح الخدمة المناسبة."
                  href="/dashboard/student-follow-up"
                  icon={<GraduationCap className="h-5 w-5" />}
                />
                <QuickPath
                  title="ابدأ من التقرير"
                  description="راجع التقارير واعتمد النسخة الرسمية."
                  href="/dashboard/reports"
                  icon={<BookOpenCheck className="h-5 w-5" />}
                />
                <QuickPath
                  title="ابدأ من الشواهد"
                  description="رتّب الصور والمرفقات قبل التصدير."
                  href="/dashboard/cases"
                  icon={<ClipboardCheck className="h-5 w-5" />}
                />
                <QuickPath
                  title="ابدأ من النتائج"
                  description="حلّل نتائج الطلاب من ملفات Excel."
                  href="/dashboard/results-analysis"
                  icon={<BarChart3 className="h-5 w-5" />}
                />
              </div>
            </section>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  آخر الأنشطة
                </h2>
                <p className="mt-1 text-xs font-bold text-slate-400">
                  نبض العمل اليومي
                </p>
              </div>

              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-full bg-slate-50 text-slate-400"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1">
              {activityItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={`${item.title}-${item.subtitle}`}
                    className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-b-0"
                  >
                    <div
                      className={[
                        "grid h-12 w-12 shrink-0 place-items-center rounded-2xl",
                        item.tone,
                      ].join(" ")}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-500">
                        {item.title}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-black text-slate-900">
                        {item.subtitle}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        {item.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  آخر التقارير
                </h2>
                <p className="mt-1 text-xs font-bold text-slate-400">
                  تقارير تحتاج انتباهك
                </p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-50 text-sky-600">
                <BookOpenCheck className="h-5 w-5" />
              </div>
            </div>

            <div className="space-y-1">
              {reportItems.map((report) => (
                <div
                  key={report.title}
                  className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-b-0"
                >
                  <div
                    className={[
                      "grid h-12 w-12 shrink-0 place-items-center rounded-2xl",
                      report.tone,
                    ].join(" ")}
                  >
                    <FileText className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-900">
                      {report.title}
                    </p>
                    <p className="mt-0.5 text-xs font-bold text-slate-500">
                      {report.period}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      {report.date}
                    </p>
                  </div>

                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                </div>
              ))}
            </div>

            <Link
              href="/dashboard/reports"
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-sky-50 text-sm font-black text-sky-700 transition hover:bg-sky-100"
            >
              عرض جميع التقارير
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </section>

          <section className="rounded-[1.75rem] border border-slate-100 bg-gradient-to-br ${theme.reminderGradient} p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-cyan-600 shadow-sm">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">
                  تذكير لطيف
                </p>
                <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                  أكمل هوية المدرسة والشعار حتى تظهر تقاريرك الرسمية بأفضل شكل.
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/settings/school"
              className="mt-4 flex h-11 items-center justify-center rounded-2xl bg-white text-sm font-black text-sky-700 shadow-sm transition hover:bg-sky-50"
            >
              تحسين الهوية الرسمية · {identityScore}%
            </Link>
          </section>
        </aside>
      </section>
    </main>
  );
}

function StatCard({
  title,
  value,
  hint,
  icon,
  tone,
}: {
  title: string;
  value: number;
  hint: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className={["grid h-12 w-12 place-items-center rounded-2xl", tone].join(" ")}>
          {icon}
        </div>
        <p className="text-3xl font-black text-slate-900">{value}</p>
      </div>
      <p className="mt-4 text-sm font-black text-slate-700">{title}</p>
      <p className="mt-2 text-xs font-bold text-emerald-600">{hint}</p>
    </article>
  );
}

function MarketingBook() {
  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-sky-100 bg-gradient-to-br ${theme.marketingGradient} p-6 text-white shadow-sm">
      <div className="absolute -left-20 -top-20 h-52 w-52 rounded-full bg-white/20 blur-3xl" />
      <div className="absolute -bottom-24 right-16 h-52 w-52 rounded-full bg-slate-950/20 blur-3xl" />

      <div className="relative z-10">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 backdrop-blur">
          <Sparkles className="h-7 w-7" />
        </div>

        <h2 className="mt-6 text-3xl font-black leading-[1.5]">
          منصة تجعل عمل الموجه واضحًا ومقنعًا
        </h2>

        <p className="mt-4 text-sm leading-8 text-sky-50">
          من متابعة الطالب إلى إصدار التقرير، كل خطوة مصممة لتختصر الوقت وتظهر
          جهدك بشكل رسمي جميل.
        </p>

        <div className="mt-6 grid gap-3">
          <MarketingLine text="توثيق أسرع بدون إعادة كتابة." />
          <MarketingLine text="شواهد مرتبة داخل PDF احترافي." />
          <MarketingLine text="هوية مدرسة تظهر تلقائيًا في كل تقرير." />
        </div>
      </div>
    </section>
  );
}

function MarketingLine({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold backdrop-blur">
      <CheckCircle2 className="h-5 w-5 shrink-0 text-cyan-100" />
      {text}
    </div>
  );
}

function QuickPath({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-sky-600 shadow-sm">
          {icon}
        </div>
        <ArrowLeft className="h-5 w-5 text-slate-300 transition group-hover:-translate-x-1 group-hover:text-sky-600" />
      </div>

      <h3 className="mt-4 text-base font-black text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-500">{description}</p>
    </Link>
  );
}
