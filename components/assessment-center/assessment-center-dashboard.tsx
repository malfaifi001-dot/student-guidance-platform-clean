import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpLeft,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Layers3,
  Lightbulb,
  Link2,
  Sparkles,
  UploadCloud,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

type AssessmentDashboardAnalysis = {
  id: string;
  title: string;
  sourceFile?: string | null;
  totalStudents: number;
  totalSubjects: number;
  totalRows: number;
  averagePercentage?: number | null;
  createdAt: Date;
  summaryJson?: unknown;
};

type AssessmentCenterDashboardProps = {
  analyses?: AssessmentDashboardAnalysis[];
  totalCount?: number;
};

type Tone = "cyan" | "emerald" | "amber" | "rose" | "slate" | "blue";

const toneClasses: Record<
  Tone,
  {
    card: string;
    icon: string;
    text: string;
    soft: string;
    border: string;
  }
> = {
  cyan: {
    card: "border-cyan-100 bg-cyan-50/60",
    icon: "bg-cyan-100 text-cyan-700",
    text: "text-cyan-700",
    soft: "bg-cyan-50 text-cyan-700",
    border: "border-cyan-100",
  },
  emerald: {
    card: "border-emerald-100 bg-emerald-50/60",
    icon: "bg-emerald-100 text-emerald-700",
    text: "text-emerald-700",
    soft: "bg-emerald-50 text-emerald-700",
    border: "border-emerald-100",
  },
  amber: {
    card: "border-amber-100 bg-amber-50/60",
    icon: "bg-amber-100 text-amber-700",
    text: "text-amber-700",
    soft: "bg-amber-50 text-amber-700",
    border: "border-amber-100",
  },
  rose: {
    card: "border-rose-100 bg-rose-50/60",
    icon: "bg-rose-100 text-rose-700",
    text: "text-rose-700",
    soft: "bg-rose-50 text-rose-700",
    border: "border-rose-100",
  },
  slate: {
    card: "border-slate-200 bg-white",
    icon: "bg-slate-100 text-slate-700",
    text: "text-slate-700",
    soft: "bg-slate-100 text-slate-700",
    border: "border-slate-200",
  },
  blue: {
    card: "border-blue-100 bg-blue-50/60",
    icon: "bg-blue-100 text-blue-700",
    text: "text-blue-700",
    soft: "bg-blue-50 text-blue-700",
    border: "border-blue-100",
  },
};

function getRiskCount(summaryJson: unknown) {
  if (!summaryJson || typeof summaryJson !== "object") return 0;

  const value = (summaryJson as { riskStudentsCount?: unknown })
    .riskStudentsCount;

  return typeof value === "number" ? value : 0;
}

function getNeedsSupportCount(summaryJson: unknown) {
  if (!summaryJson || typeof summaryJson !== "object") return 0;

  const value = (summaryJson as { needsSupportStudentsCount?: unknown })
    .needsSupportStudentsCount;

  return typeof value === "number" ? value : 0;
}

function formatDate(value: Date) {
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(value);
  } catch {
    return "غير محدد";
  }
}

function formatAverage(value?: number | null) {
  if (value === null || value === undefined) return "0%";

  return `${Math.round(Number(value || 0))}%`;
}

function StatCard({
  label,
  value,
  note,
  icon: Icon,
  tone = "cyan",
}: {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  const classes = toneClasses[tone];

  return (
    <article
      className={`rounded-[1.7rem] border ${classes.card} p-5 shadow-sm`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-black text-slate-950 md:text-4xl">
            {value}
          </p>
        </div>

        <div className={`grid h-12 w-12 place-items-center rounded-2xl ${classes.icon}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>

      <p className="mt-4 text-sm font-bold leading-7 text-slate-500">{note}</p>
    </article>
  );
}

function QuickAction({
  title,
  description,
  href,
  icon: Icon,
  tone = "cyan",
}: {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  const classes = toneClasses[tone];

  return (
    <Link
      href={href}
      className={`group rounded-[1.4rem] border ${classes.border} bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-lg`}
    >
      <div className="flex items-start gap-3">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${classes.icon}`}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-black text-slate-950">{title}</h3>
          <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}

function AnalysisCard({ analysis }: { analysis: AssessmentDashboardAnalysis }) {
  const average = Math.round(Number(analysis.averagePercentage || 0));
  const riskCount = getRiskCount(analysis.summaryJson);
  const needsSupportCount = getNeedsSupportCount(analysis.summaryJson);

  return (
    <Link
      href={`/dashboard/assessment-center/${analysis.id}`}
      className="block rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-5 transition hover:border-cyan-100 hover:bg-cyan-50/40 hover:shadow-sm"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black text-slate-950">
              {analysis.title}
            </h3>

            {riskCount > 0 ? (
              <span className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-black text-rose-700">
                {riskCount} يحتاجون متابعة
              </span>
            ) : (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
                مستقر
              </span>
            )}
          </div>

          <p className="mt-2 truncate text-sm font-bold text-slate-500">
            {analysis.sourceFile || "ملف غير محدد"}
          </p>

          <p className="mt-1 text-xs font-bold text-slate-400">
            {formatDate(analysis.createdAt)}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-4 lg:min-w-[520px]">
          <MiniMetric label="الطلاب" value={String(analysis.totalStudents)} />
          <MiniMetric label="المواد" value={String(analysis.totalSubjects)} />
          <MiniMetric label="الدعم" value={String(needsSupportCount)} />
          <MiniMetric label="المتوسط" value={`${average}%`} strong />
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
        <div
          className={[
            "h-full rounded-full",
            average >= 80
              ? "bg-emerald-500"
              : average >= 60
                ? "bg-cyan-500"
                : average >= 40
                  ? "bg-amber-500"
                  : "bg-rose-500",
          ].join(" ")}
          style={{ width: `${Math.max(0, Math.min(average, 100))}%` }}
        />
      </div>
    </Link>
  );
}

function MiniMetric({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white px-3 py-2 text-center">
      <p className="text-[11px] font-black text-slate-400">{label}</p>
      <p
        className={[
          "mt-1 text-sm font-black",
          strong ? "text-cyan-700" : "text-slate-800",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

export function AssessmentCenterDashboard({
  analyses = [],
  totalCount = 0,
}: AssessmentCenterDashboardProps) {
  const latestAnalysis = analyses[0] || null;

  const riskStudentsCount = analyses.reduce(
    (sum, analysis) => sum + getRiskCount(analysis.summaryJson),
    0,
  );

  const needsSupportStudentsCount = analyses.reduce(
    (sum, analysis) => sum + getNeedsSupportCount(analysis.summaryJson),
    0,
  );

  const latestAverage = latestAnalysis
    ? formatAverage(latestAnalysis.averagePercentage)
    : "0%";

  return (
    <main className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-100 bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700 p-6 text-white shadow-xl md:p-8">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-teal-300/20 blur-3xl" />

        <div className="relative z-10 grid gap-6 xl:grid-cols-[1fr_360px] xl:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/15 px-4 py-2 text-sm font-black text-cyan-50 backdrop-blur">
              <BrainCircuit className="h-4 w-4" />
              Assessment Center
            </div>

            <h1 className="mt-5 text-4xl font-black leading-tight md:text-5xl">
              مركز التحليل والاختبارات
            </h1>

            <p className="mt-4 max-w-4xl text-base font-bold leading-8 text-cyan-50/90">
              حلّل نتائج الطلاب، اكتشف الطلاب الأكثر احتياجًا، ثم اربط النتائج
              بالتدخلات الذكية والتقارير الرسمية من مكان واحد.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <Link
              href="/dashboard/assessment-center/new"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-cyan-700 transition hover:bg-cyan-50"
            >
              تحليل جديد
              <ArrowUpLeft className="h-4 w-4" />
            </Link>

            <Link
              href="/dashboard/assessment-center/analyses"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/15 px-6 py-3 text-sm font-black text-white transition hover:bg-white/20"
            >
              التحليلات السابقة
              <FileText className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="التحليلات"
          value={String(totalCount)}
          note="إجمالي التحليلات المحفوظة"
          icon={BarChart3}
          tone="cyan"
        />

        <StatCard
          label="طلاب يحتاجون متابعة"
          value={String(riskStudentsCount)}
          note="حسب آخر التحليلات المعروضة"
          icon={AlertTriangle}
          tone="rose"
        />

        <StatCard
          label="طلاب يحتاجون دعم"
          value={String(needsSupportStudentsCount)}
          note="مؤشر مبكر للتدخلات"
          icon={UsersRound}
          tone="amber"
        />

        <StatCard
          label="متوسط آخر تحليل"
          value={latestAverage}
          note={latestAnalysis ? latestAnalysis.title : "لا يوجد تحليل بعد"}
          icon={Lightbulb}
          tone="emerald"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.55fr_0.9fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-cyan-600">آخر التحليلات</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                التحليلات المحفوظة
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/assessment-center/new"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-black text-white transition hover:bg-cyan-700"
              >
                رفع تحليل
                <UploadCloud className="h-4 w-4" />
              </Link>

              <Link
                href="/dashboard/assessment-center/analyses"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                عرض الكل
                <ArrowUpLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {analyses.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-cyan-200 bg-cyan-50/60 p-8 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-cyan-700 shadow-sm">
                  <FileSpreadsheet className="h-7 w-7" />
                </div>

                <h3 className="mt-4 text-xl font-black text-slate-950">
                  لا توجد تحليلات بعد
                </h3>

                <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-7 text-slate-500">
                  ابدأ برفع ملف نتائج Excel، وبعدها ستظهر هنا مؤشرات الأداء
                  والطلاب المحتاجون للمتابعة.
                </p>

                <Link
                  href="/dashboard/assessment-center/new"
                  className="mt-5 inline-flex items-center justify-center rounded-2xl bg-cyan-600 px-6 py-3 text-sm font-black text-white transition hover:bg-cyan-700"
                >
                  رفع أول تحليل
                </Link>
              </div>
            ) : (
              analyses.map((analysis) => (
                <AnalysisCard key={analysis.id} analysis={analysis} />
              ))
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-cyan-600">تشغيل سريع</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  ماذا تريد أن تفعل؟
                </h2>
              </div>

              <Sparkles className="h-7 w-7 text-cyan-600" />
            </div>

            <div className="mt-5 grid gap-3">
              <QuickAction
                title="تحليل جديد"
                description="رفع ملف Excel وإنشاء قراءة ذكية للنتائج."
                href="/dashboard/assessment-center/new"
                icon={UploadCloud}
                tone="cyan"
              />

              <QuickAction
                title="الطلاب المعرضون للخطر"
                description="استعراض الطلاب الأكثر احتياجًا للمتابعة."
                href="/dashboard/assessment-center/risk-students"
                icon={AlertTriangle}
                tone="rose"
              />

              <QuickAction
                title="التوصيات والتدخلات"
                description="الانتقال للتوصيات وربطها بالتدخل الذكي."
                href="/dashboard/assessment-center/recommendations"
                icon={Lightbulb}
                tone="amber"
              />

              <QuickAction
                title="التقارير"
                description="فتح مخرجات التحليل والتصدير."
                href="/dashboard/assessment-center/reports"
                icon={ClipboardList}
                tone="emerald"
              />
            </div>
          </section>

          <section className="rounded-[2rem] border border-emerald-100 bg-emerald-50/60 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-emerald-700 shadow-sm">
                <CheckCircle2 className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-black text-emerald-700">
                  حالة المركز
                </p>
                <h2 className="text-xl font-black text-slate-950">
                  جاهز للتشغيل
                </h2>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {[
                "رفع وتحليل Excel يعمل.",
                "ربط النتائج بالطلاب يعمل.",
                "التدخل الذكي متاح من تفاصيل التحليل.",
                "التقارير والقوالب جاهزة للربط حسب الخدمة.",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm font-black text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <QuickAction
          title="تحليل الصفوف والفصول"
          description="مقارنة الصفوف والفصول حسب متوسطات الأداء."
          href="/dashboard/assessment-center/classes"
          icon={Layers3}
          tone="blue"
        />

        <QuickAction
          title="تحليل المواد"
          description="قراءة أداء المواد واكتشاف المواد الأضعف."
          href="/dashboard/assessment-center/subjects"
          icon={FileSpreadsheet}
          tone="cyan"
        />

        <QuickAction
          title="الربط مع الحالات"
          description="فتح التدخلات وتحويل النتائج إلى حالات متابعة."
          href="/dashboard/assessment-center/recommendations"
          icon={Link2}
          tone="emerald"
        />

        <QuickAction
          title="التحليلات السابقة"
          description="إدارة وفتح وحذف التحليلات المحفوظة."
          href="/dashboard/assessment-center/analyses"
          icon={BrainCircuit}
          tone="slate"
        />
      </section>
    </main>
  );
}