import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpLeft,
  BarChart3,
  Sparkles,
  UploadCloud,
  UsersRound,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";

function getNumberFromSummary(summaryJson: unknown, key: string) {
  if (!summaryJson || typeof summaryJson !== "object") return 0;

  const value = (summaryJson as Record<string, unknown>)[key];

  return typeof value === "number" ? value : 0;
}

function formatAverage(value?: number | null) {
  if (value === null || value === undefined) return "0%";
  return `${Math.round(Number(value || 0))}%`;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(value);
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof BarChart3;
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

export default async function AssessmentCenterSmartCounselorPage() {
  const context = await requireDashboardPageContext();

  const analyses = await prisma.assessmentAnalysis.findMany({
    where: context.isAdmin
      ? {}
      : {
          schoolAccountId: context.schoolAccountId,
        },
    orderBy: {
      createdAt: "desc",
    },
    take: 30,
  });

  const cards = analyses.map((analysis) => {
    const riskStudentsCount = getNumberFromSummary(
      analysis.summaryJson,
      "riskStudentsCount",
    );

    const needsSupportStudentsCount = getNumberFromSummary(
      analysis.summaryJson,
      "needsSupportStudentsCount",
    );

    return {
      analysis,
      riskStudentsCount,
      needsSupportStudentsCount,
    };
  });

  return (
    <main className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-100 bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700 p-6 text-white shadow-xl md:p-8">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-teal-300/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/15 px-4 py-2 text-sm font-black text-cyan-50 backdrop-blur">
              <Sparkles className="h-4 w-4" />
              الموجه الذكي
            </div>

            <h1 className="mt-5 text-4xl font-black leading-tight md:text-5xl">
              الموجه الذكي
            </h1>

            <p className="mt-4 max-w-4xl text-base font-bold leading-8 text-cyan-50/90">
              اختر تحليلًا ثم افتح الموجه الذكي.
            </p>
          </div>

          <Link
            href="/dashboard/assessment-center/new"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-cyan-700 transition hover:bg-cyan-50"
          >
            رفع تحليل جديد
            <UploadCloud className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="التحليلات المتاحة"
          value={String(analyses.length)}
          icon={BarChart3}
        />

        <StatCard
          label="يحتاجون متابعة"
          value={String(
            cards.reduce((sum, item) => sum + item.riskStudentsCount, 0),
          )}
          icon={AlertTriangle}
        />

        <StatCard
          label="يحتاجون دعم"
          value={String(
            cards.reduce((sum, item) => sum + item.needsSupportStudentsCount, 0),
          )}
          icon={UsersRound}
        />
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black text-cyan-600">اختر تحليلًا</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              افتح الموجه الذكي
            </h2>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {cards.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-cyan-200 bg-cyan-50/60 p-8 text-center">
              <h3 className="text-xl font-black text-slate-950">
                لا توجد تحليلات
              </h3>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                ارفع ملف نتائج أولًا.
              </p>
            </div>
          ) : (
            cards.map(
              ({ analysis, riskStudentsCount, needsSupportStudentsCount }) => (
                <Link
                  key={analysis.id}
                  href={`/dashboard/assessment-center/${analysis.id}/interventions`}
                  className="block rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-5 transition hover:border-cyan-100 hover:bg-cyan-50/40 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-slate-950">
                          {analysis.title}
                        </h3>

                        <span
                          className={[
                            "rounded-full px-3 py-1 text-[11px] font-black",
                            riskStudentsCount > 0
                              ? "bg-rose-50 text-rose-700"
                              : "bg-emerald-50 text-emerald-700",
                          ].join(" ")}
                        >
                          {riskStudentsCount > 0 ? "توجد خطط مقترحة" : "جاهز"}
                        </span>
                      </div>

                      <p className="mt-2 text-sm font-bold text-slate-500">
                        {formatDate(analysis.createdAt)}
                      </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-4 lg:min-w-[520px]">
                      <MiniMetric label="الطلاب" value={String(analysis.totalStudents)} />
                      <MiniMetric label="متابعة" value={String(riskStudentsCount)} />
                      <MiniMetric label="دعم" value={String(needsSupportStudentsCount)} />
                      <MiniMetric
                        label="المتوسط"
                        value={formatAverage(analysis.averagePercentage)}
                        strong
                      />
                    </div>
                  </div>

                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-black text-cyan-700">
                    فتح الموجه الذكي
                    <ArrowUpLeft className="h-4 w-4" />
                  </div>
                </Link>
              ),
            )
          )}
        </div>
      </section>
    </main>
  );
}
