import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  FileText,
  GraduationCap,
  HeartHandshake,
  MessageCircle,
  Rocket,
  School,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users,
  WandSparkles,
} from "lucide-react";

type CreativeDashboardProps = {
  user: {
    name?: string | null;
    officialName?: string | null;
    gender?: string | null;
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

const mainActions = [
  {
    title: "إنشاء تقرير رسمي",
    description: "ابدأ من حالة محفوظة، واسحب البيانات والشواهد تلقائيًا.",
    href: "/dashboard/reports",
    icon: FileText,
    tone: "from-blue-600 to-cyan-500",
  },
  {
    title: "رفع بيانات الطلاب",
    description: "استورد الطلاب بذكاء وجهّزهم لكل الخدمات والتقارير.",
    href: "/dashboard/student-import",
    icon: UploadCloud,
    tone: "from-emerald-600 to-teal-500",
  },
  {
    title: "فتح مركز الحالات",
    description: "كل الحالات والسجلات والمتابعات في مكان واحد.",
    href: "/dashboard/cases",
    icon: ClipboardList,
    tone: "from-violet-600 to-fuchsia-500",
  },
];

const serviceCards = [
  {
    title: "متابعة الطلاب",
    description: "تابع الحالات الفردية بواجهة هادئة وسجل واضح.",
    href: "/dashboard/student-follow-up",
    icon: Users,
  },
  {
    title: "تواصل الأسرة والمدرسة",
    description: "وثّق التواصل والنتائج والتوصيات بدون تكرار.",
    href: "/dashboard/family-school-communication",
    icon: MessageCircle,
  },
  {
    title: "اللجان والاجتماعات",
    description: "محاضر وتوصيات وسلاسل مترابطة داخل Workflow.",
    href: "/dashboard/committees-meetings",
    icon: ShieldCheck,
  },
  {
    title: "البرامج الإرشادية",
    description: "نفّذ برنامجًا إرشاديًا واربط الشواهد والتقارير.",
    href: "/dashboard/guidance-programs",
    icon: HeartHandshake,
  },
];

const smartTips = [
  "أكمل هوية المدرسة مرة واحدة، ثم اترك التقارير تعبئها تلقائيًا.",
  "اجعل الشواهد مرتبة قبل التصدير حتى يظهر PDF بشكل رسمي.",
  "ابدأ من مركز الحالات عندما لا تعرف من أين تكمل.",
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

function calculateIdentityScore(user: CreativeDashboardProps["user"]) {
  const profile = user.schoolAccount?.profile;

  const checks = [
    user.officialName,
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

export function CreativeDashboard({ user, stats }: CreativeDashboardProps) {
  const displayName = user.officialName || user.name || "الموجه/الموجهة";
  const schoolName =
    user.schoolAccount?.profile?.schoolName ||
    user.schoolAccount?.name ||
    "مدرستك";
  const greeting = getRiyadhGreeting();
  const identityScore = calculateIdentityScore(user);
  const genderLabel = user.gender === "FEMALE" ? "موجهة طلابية" : "موجه طلابي";

  return (
    <main className="space-y-8">
      <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 p-6 text-white shadow-2xl md:p-8">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/25 blur-3xl" />
        <div className="absolute bottom-0 right-1/3 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />

        <div className="relative z-10 grid gap-8 xl:grid-cols-[1.1fr_360px]">
          <div className="flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-cyan-100 backdrop-blur">
                <Sparkles className="h-4 w-4" />
                تجربة عمل أهدأ · تقارير أسرع · شواهد منظمة
              </div>

              <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.5] md:text-5xl">
                {greeting}، {displayName}
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
                هذه مساحتك اليومية لإدارة التوجيه الطلابي من أول اختيار الطالب
                حتى إصدار تقرير رسمي أنيق. المنصة تختصر العمل المتكرر وتترك لك
                القرار المهني.
              </p>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {mainActions.map((action) => {
                const Icon = action.icon;

                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur transition hover:-translate-y-1 hover:bg-white/15"
                  >
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${action.tone} text-white shadow-lg`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <h2 className="mt-4 text-lg font-black text-white">
                      {action.title}
                    </h2>

                    <p className="mt-2 min-h-14 text-xs leading-6 text-slate-300">
                      {action.description}
                    </p>

                    <div className="mt-4 flex items-center gap-2 text-xs font-black text-cyan-200">
                      ابدأ الآن
                      <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
            <div className="mx-auto flex h-40 w-40 items-center justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-white/10">
              <img
                src={user.schoolAccount?.profile?.logoUrl || "/brand/guidance-avatar.svg"}
                alt="هوية المنصة"
                className="h-full w-full object-contain p-3"
              />
            </div>

            <div className="mt-5 text-center">
              <p className="text-xs font-black text-cyan-200">{genderLabel}</p>
              <h3 className="mt-2 text-2xl font-black text-white">
                {schoolName}
              </h3>
              <p className="mt-2 text-xs leading-6 text-slate-300">
                كل خدمة هنا مصممة لتقلل وقت التوثيق وتزيد جودة المخرجات.
              </p>
            </div>

            <div className="mt-5 rounded-3xl bg-slate-950/60 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-slate-300">
                  جاهزية الهوية الرسمية
                </p>
                <p className="text-lg font-black text-cyan-200">
                  {identityScore}%
                </p>
              </div>

              <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-cyan-300 to-blue-500"
                  style={{ width: `${identityScore}%` }}
                />
              </div>

              <Link
                href="/dashboard/settings/school"
                className="mt-4 block rounded-2xl bg-white px-4 py-3 text-center text-xs font-black text-slate-950 transition hover:bg-cyan-50"
              >
                تحسين الهوية الرسمية
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-5 md:grid-cols-2">
          <BigMetricCard
            title="الطلاب"
            value={stats.students}
            description="طلاب جاهزون للاستخدام في الخدمات والتقارير."
            icon={<GraduationCap className="h-6 w-6" />}
            href="/dashboard/students"
          />

          <BigMetricCard
            title="الحالات"
            value={stats.cases}
            description="سجلات محفوظة من مختلف الخدمات."
            icon={<ClipboardList className="h-6 w-6" />}
            href="/dashboard/cases"
          />

          <SmallMetricCard
            title="التقارير"
            value={stats.reports}
            icon={<FileText className="h-5 w-5" />}
            href="/dashboard/reports"
          />

          <SmallMetricCard
            title="الشواهد"
            value={stats.evidences}
            icon={<BookOpenCheck className="h-5 w-5" />}
            href="/dashboard/cases"
          />
        </div>

        <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <WandSparkles className="h-6 w-6" />
          </div>

          <h2 className="mt-5 text-2xl font-black text-slate-950">
            مرشدك الذكي داخل المنصة
          </h2>

          <p className="mt-3 text-sm leading-8 text-slate-500">
            فكر في المنصة كمساعد يومي: يرتب السجلات، يختصر التوثيق، ويحوّل
            العمل المتكرر إلى تقارير جاهزة.
          </p>

          <div className="mt-5 space-y-3">
            {smartTips.map((tip) => (
              <div
                key={tip}
                className="flex gap-3 rounded-2xl bg-slate-50 p-3"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <p className="text-sm font-bold leading-7 text-slate-600">
                  {tip}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <MarketingBox />

        <div className="grid gap-4 md:grid-cols-2">
          {serviceCards.map((service) => {
            const Icon = service.icon;

            return (
              <Link
                key={service.href}
                href={service.href}
                className="group rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <Icon className="h-5 w-5" />
                  </div>

                  <ArrowLeft className="h-5 w-5 text-slate-300 transition group-hover:-translate-x-1 group-hover:text-blue-600" />
                </div>

                <h3 className="mt-5 text-xl font-black text-slate-950">
                  {service.title}
                </h3>

                <p className="mt-2 text-sm leading-7 text-slate-500">
                  {service.description}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <QuickPathCard
          title="ابدأ من الطالب"
          description="اختر الطالب ثم افتح الخدمة المناسبة."
          href="/dashboard/student-follow-up"
          icon={<Users className="h-5 w-5" />}
        />

        <QuickPathCard
          title="ابدأ من التقارير"
          description="راجع التقارير واعتمد النسخة الرسمية."
          href="/dashboard/reports"
          icon={<FileText className="h-5 w-5" />}
        />

        <QuickPathCard
          title="ابدأ من التحليل"
          description="ارفع Excel النتائج واستخرج مؤشرات ذكية."
          href="/dashboard/results-analysis"
          icon={<BarChart3 className="h-5 w-5" />}
        />
      </section>
    </main>
  );
}

function BigMetricCard({
  title,
  value,
  description,
  icon,
  href,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="absolute -left-12 -top-12 h-32 w-32 rounded-full bg-blue-100 blur-2xl transition group-hover:bg-cyan-100" />

      <div className="relative z-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
          {icon}
        </div>

        <p className="mt-6 text-sm font-black text-slate-500">{title}</p>
        <p className="mt-2 text-5xl font-black text-slate-950">{value}</p>
        <p className="mt-3 text-sm leading-7 text-slate-500">{description}</p>
      </div>
    </Link>
  );
}

function SmallMetricCard({
  title,
  value,
  icon,
  href,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div>
        <p className="text-sm font-black text-slate-500">{title}</p>
        <p className="mt-2 text-4xl font-black text-slate-950">{value}</p>
      </div>

      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
        {icon}
      </div>
    </Link>
  );
}

function MarketingBox() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600 to-cyan-500 p-6 text-white shadow-xl">
      <div className="absolute -left-16 -top-16 h-44 w-44 rounded-full bg-white/20 blur-2xl" />
      <div className="absolute -bottom-16 right-10 h-44 w-44 rounded-full bg-slate-950/20 blur-2xl" />

      <div className="relative z-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
          <Rocket className="h-7 w-7" />
        </div>

        <h2 className="mt-6 text-3xl font-black leading-[1.5]">
          منصة تختصر وقت الموجه وتُظهر عمله باحتراف
        </h2>

        <p className="mt-4 text-sm leading-8 text-blue-50">
          وثّق، تابع، ارفع الشواهد، ثم أصدر تقريرًا رسميًا خلال دقائق. كل شيء
          مبني حول تجربة الموجه/الموجهة اليومية.
        </p>

        <div className="mt-6 grid gap-3">
          <MarketingLine text="من التوثيق المتكرر إلى تقرير رسمي بضغطة." />
          <MarketingLine text="كل شاهد في مكانه، وكل حالة لها أثر واضح." />
          <MarketingLine text="تجربة SaaS حديثة للمدارس والموجهين." />
        </div>

        <Link
          href="/dashboard/settings/school"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-50"
        >
          جهّز الهوية الرسمية
          <ArrowLeft className="h-4 w-4" />
        </Link>
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

function QuickPathCard({
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
      className="group rounded-[2rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-cyan-200">
          {icon}
        </div>

        <ArrowLeft className="h-5 w-5 text-slate-500 transition group-hover:-translate-x-1 group-hover:text-cyan-200" />
      </div>

      <h3 className="mt-5 text-xl font-black">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-300">{description}</p>
    </Link>
  );
}
