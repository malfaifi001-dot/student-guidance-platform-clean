import Link from "next/link";
import {
  ArrowUpLeft,
  BarChart3,
  CheckCircle2,
  GitBranch,
  UploadCloud,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";

type AssessmentRowLike = {
  studentId?: string | null;
  linkStatus?: string | null;
};

function getRows(value: unknown): AssessmentRowLike[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (row) => row && typeof row === "object",
  ) as AssessmentRowLike[];
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(value);
}

export default async function AssessmentCenterLinkingPage() {
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
    const rows = getRows(analysis.rowsJson);
    const linkedCount = rows.filter((row) => row.studentId).length;
    const reviewCount = rows.filter(
      (row) => row.linkStatus === "AMBIGUOUS",
    ).length;
    const actionNeededCount = rows.filter(
      (row) => !row.studentId || row.linkStatus === "AMBIGUOUS",
    ).length;

    return {
      analysis,
      linkedCount,
      reviewCount,
      actionNeededCount,
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
              <GitBranch className="h-4 w-4" />
              ربط الطلاب
            </div>

            <h1 className="mt-5 text-4xl font-black leading-tight md:text-5xl">
              ربط الطلاب
            </h1>

            <p className="mt-4 max-w-4xl text-base font-bold leading-8 text-cyan-50/90">
              اختر تحليلًا ثم راجع الطلاب غير المرتبطين.
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

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black text-cyan-600">اختر التحليل</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              نتائج تحتاج ربط
            </h2>
          </div>

          <BarChart3 className="h-7 w-7 text-cyan-600" />
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
              ({ analysis, linkedCount, reviewCount, actionNeededCount }) => (
                <Link
                  key={analysis.id}
                  href={`/dashboard/assessment-center/${analysis.id}/linking`}
                  className="block rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-5 transition hover:border-cyan-100 hover:bg-cyan-50/40 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-slate-950">
                          {analysis.title}
                        </h3>

                        {actionNeededCount > 0 ? (
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700">
                            يحتاج ربط
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            مربوط
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm font-bold text-slate-500">
                        {formatDate(analysis.createdAt)}
                      </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-4 lg:min-w-[520px]">
                      <MiniMetric label="الإجمالي" value={String(analysis.totalStudents)} />
                      <MiniMetric label="مربوط" value={String(linkedCount)} />
                      <MiniMetric label="يحتاج مراجعة" value={String(reviewCount)} />
                      <MiniMetric label="يحتاج ربط" value={String(actionNeededCount)} strong />
                    </div>
                  </div>

                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-black text-cyan-700">
                    فتح الربط
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
