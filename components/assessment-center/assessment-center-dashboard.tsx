import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpLeft,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  GitCompareArrows,
  Link2,
  UploadCloud,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { getGradeBand, getGradeBandLabel } from "@/lib/assessment-center/assessment-analysis-summary";

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

type Tone = "cyan" | "emerald" | "amber" | "rose";

const toneClasses: Record<
  Tone,
  {
    icon: string;
    badge: string;
  }
> = {
  cyan: {
    icon: "bg-cyan-100 text-cyan-700",
    badge: "bg-cyan-50 text-cyan-700",
  },
  emerald: {
    icon: "bg-emerald-100 text-emerald-700",
    badge: "bg-emerald-50 text-emerald-700",
  },
  amber: {
    icon: "bg-amber-100 text-amber-700",
    badge: "bg-amber-50 text-amber-700",
  },
  rose: {
    icon: "bg-rose-100 text-rose-700",
    badge: "bg-rose-50 text-rose-700",
  },
};

function getRiskCount(summaryJson: unknown) {
  if (!summaryJson || typeof summaryJson !== "object") return 0;

  const summary = summaryJson as {
    riskStudentsCount?: unknown;
    weakStudents?: unknown;
  };

  if (Array.isArray(summary.weakStudents)) {
    return summary.weakStudents.length;
  }

  return typeof summary.riskStudentsCount === "number"
    ? summary.riskStudentsCount
    : 0;
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
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <article className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-black text-slate-950 md:text-4xl">
            {value}
          </p>
        </div>

        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </article>
  );
}

function StepCard({ title }: { title: string }) {
  return (
    <article className="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 text-center">
      <p className="text-sm font-black text-slate-900">{title}</p>
    </article>
  );
}

function ActionCard({
  title,
  description,
  href,
  icon: Icon,
  tone,
}: {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone: Tone;
}) {
  const classes = toneClasses[tone];

  return (
    <Link
      href={href}
      className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${classes.icon}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <h3 className="text-base font-black text-slate-950">{title}</h3>
          <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}

function MiniMetric({
  label,
  value,
  tone = "cyan",
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
  const classes = toneClasses[tone];

  return (
    <div className="rounded-2xl bg-white px-3 py-2 text-center">
      <p className="text-[11px] font-black text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-black ${classes.badge.split(" ")[1]}`}>
        {value}
      </p>
    </div>
  );
}

function AnalysisCard({ analysis }: { analysis: AssessmentDashboardAnalysis }) {
  const riskCount = getRiskCount(analysis.summaryJson);
  const bandLabel = getGradeBandLabel(getGradeBand(analysis.averagePercentage));

  return (
    <article className="rounded-[1.6rem] border border-slate-100 bg-slate-50/80 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black text-slate-950">
              {analysis.title}
            </h3>

            <span className="rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-black text-cyan-700">
              {bandLabel}
            </span>
          </div>

          <p className="mt-2 text-sm font-bold text-slate-500">
            {formatDate(analysis.createdAt)}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[360px]">
          <MiniMetric label="الطلاب" value={String(analysis.totalStudents)} />
          <MiniMetric
            label="المتوسط"
            value={formatAverage(analysis.averagePercentage)}
            tone="emerald"
          />
          <MiniMetric
            label="الطلاب الضعاف"
            value={String(riskCount)}
            tone="rose"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/dashboard/assessment-center/${analysis.id}`}
          className="inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-cyan-700"
        >
          فتح
          <ArrowUpLeft className="h-4 w-4" />
        </Link>

        <Link
          href={`/dashboard/assessment-center/compare?first=${analysis.id}`}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
        >
          مقارنة
          <GitCompareArrows className="h-4 w-4" />
        </Link>
      </div>
    </article>
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

  return (
    <main className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-100 bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700 p-6 text-white shadow-xl md:p-8">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-teal-300/20 blur-3xl" />

        <div className="relative z-10 grid gap-6 xl:grid-cols-[1fr_320px] xl:items-end">
          <div>
            <h1 className="text-4xl font-black leading-tight md:text-5xl">
              تحليل النتائج
            </h1>

            <p className="mt-4 max-w-3xl text-base font-bold leading-8 text-cyan-50/90">
              ارفع ملف النتائج، راجع المؤشرات، ثم أنشئ خطة متابعة.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <Link
              href="/dashboard/assessment-center/new"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-cyan-700 transition hover:bg-cyan-50"
            >
              رفع تحليل جديد
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

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">
            <BrainCircuit className="h-5 w-5" />
          </div>

          <div>
            <p className="text-sm font-black text-cyan-600">الخطوات</p>
            <h2 className="text-2xl font-black text-slate-950">
              مسار العمل
            </h2>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StepCard title="١. ارفع ملف Excel" />
          <StepCard title="٢. راجع النتائج" />
          <StepCard title="٣. اربط الطلاب" />
          <StepCard title="٤. أنشئ خطة أو تقرير" />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="التحليلات"
          value={String(totalCount)}
          icon={BarChart3}
        />
        <StatCard
          label="يحتاجون متابعة"
          value={String(riskStudentsCount)}
          icon={AlertTriangle}
        />
        <StatCard
          label="يحتاجون دعم"
          value={String(needsSupportStudentsCount)}
          icon={UsersRound}
        />
        <StatCard
          label="متوسط آخر تحليل"
          value={latestAnalysis ? formatAverage(latestAnalysis.averagePercentage) : "0%"}
          icon={CheckCircle2}
        />
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black text-cyan-600">ابدأ من هنا</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              الإجراء التالي
            </h2>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <ActionCard
            title="رفع تحليل جديد"
            description="ابدأ برفع ملف نتائج جديد."
            href="/dashboard/assessment-center/new"
            icon={UploadCloud}
            tone="cyan"
          />

          <ActionCard
            title={latestAnalysis ? "فتح آخر تحليل" : "فتح التحليلات السابقة"}
            description={
              latestAnalysis
                ? latestAnalysis.title
                : "راجع التحليلات المحفوظة."
            }
            href={
              latestAnalysis
                ? `/dashboard/assessment-center/${latestAnalysis.id}`
                : "/dashboard/assessment-center/analyses"
            }
            icon={FileSpreadsheet}
            tone="emerald"
          />

          <ActionCard
            title="مراجعة الربط"
            description="راجع الطلاب غير المرتبطين قبل إنشاء الخطة."
            href="/dashboard/assessment-center/linking"
            icon={Link2}
            tone="amber"
          />
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-950">
              آخر التحليلات
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/assessment-center/compare"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              مقارنة التحليلات
              <GitCompareArrows className="h-4 w-4" />
            </Link>

            <Link
              href="/dashboard/assessment-center/analyses"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              عرض الكل
              <ArrowUpLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {analyses.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-cyan-200 bg-cyan-50/60 p-8 text-center">
              <h3 className="text-xl font-black text-slate-950">
                لا توجد تحليلات
              </h3>

              <Link
                href="/dashboard/assessment-center/new"
                className="mt-5 inline-flex items-center justify-center rounded-2xl bg-cyan-600 px-6 py-3 text-sm font-black text-white transition hover:bg-cyan-700"
              >
                رفع تحليل جديد
              </Link>
            </div>
          ) : (
            analyses.map((analysis) => (
              <AnalysisCard key={analysis.id} analysis={analysis} />
            ))
          )}
        </div>
      </section>

      <section className="rounded-[2rem] border border-emerald-100 bg-emerald-50/60 p-5 shadow-sm">
        <p className="text-sm font-black text-emerald-700">
          المركز جاهز لرفع وتحليل النتائج.
        </p>
      </section>

    </main>
  );
}
