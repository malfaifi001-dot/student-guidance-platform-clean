import Link from "next/link";
import {
  ArrowUpLeft,
  Download,
  FileSpreadsheet,
  FileText,
  SearchX,
} from "lucide-react";
import { DeleteAssessmentAnalysisButton } from "./delete-assessment-analysis-button";

type AssessmentAnalysisItem = {
  id: string;
  title: string;
  sourceFile?: string | null;
  totalStudents: number;
  totalRows: number;
  totalSubjects: number;
  averagePercentage?: number | null;
  createdAt: Date;
  summaryJson?: unknown;
};

function getRiskCount(summaryJson: unknown) {
  if (!summaryJson || typeof summaryJson !== "object") return 0;

  const value = (summaryJson as { riskStudentsCount?: unknown })
    .riskStudentsCount;

  return typeof value === "number" ? value : 0;
}

export function AssessmentAnalysesList({
  analyses,
}: {
  analyses: AssessmentAnalysisItem[];
}) {
  if (analyses.length === 0) {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-slate-50 text-slate-400">
          <SearchX className="h-8 w-8" />
        </div>

        <h2 className="mt-5 text-2xl font-black text-slate-950">
          لا توجد تحليلات حتى الآن
        </h2>

        <p className="mx-auto mt-3 max-w-xl text-sm font-bold leading-8 text-slate-500">
          ابدأ برفع ملف نتائج من صفحة تحليل جديد، وبعدها ستظهر التحليلات هنا
          مع خيارات التصدير والحذف.
        </p>

        <Link
          href="/dashboard/assessment-center/new"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-6 py-3 text-sm font-black text-white transition hover:bg-cyan-700"
        >
          تحليل جديد
          <ArrowUpLeft className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {analyses.map((analysis) => (
        <article
          key={analysis.id}
          className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-100 hover:shadow-md"
        >
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                  Assessment
                </span>
                <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">
                  {analysis.createdAt.toLocaleDateString("ar-SA")}
                </span>
              </div>

              <h2 className="mt-3 text-xl font-black text-slate-950">
                {analysis.title}
              </h2>

              <p className="mt-2 text-sm font-bold text-slate-500">
                {analysis.sourceFile || "ملف غير محدد"}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-4 xl:min-w-[520px]">
              <div className="rounded-2xl bg-slate-50 p-3 text-center">
                <p className="text-[11px] font-black text-slate-400">
                  الطلاب
                </p>
                <p className="mt-1 text-lg font-black text-slate-950">
                  {analysis.totalStudents}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3 text-center">
                <p className="text-[11px] font-black text-slate-400">
                  المواد
                </p>
                <p className="mt-1 text-lg font-black text-slate-950">
                  {analysis.totalSubjects}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3 text-center">
                <p className="text-[11px] font-black text-slate-400">
                  المتوسط
                </p>
                <p className="mt-1 text-lg font-black text-cyan-700">
                  {Math.round(Number(analysis.averagePercentage || 0))}%
                </p>
              </div>

              <div className="rounded-2xl bg-rose-50 p-3 text-center">
                <p className="text-[11px] font-black text-rose-400">
                  يحتاجون متابعة
                </p>
                <p className="mt-1 text-lg font-black text-rose-700">
                  {getRiskCount(analysis.summaryJson)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href={`/dashboard/assessment-center/${analysis.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-cyan-700"
            >
              فتح التفاصيل
              <ArrowUpLeft className="h-4 w-4" />
            </Link>

            <a
              href={`/api/dashboard/assessment-center/${analysis.id}/export?format=excel`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-xs font-black text-emerald-700 transition hover:bg-emerald-100"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </a>

            <a
              href={`/api/dashboard/assessment-center/${analysis.id}/export?format=pdf`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-2.5 text-xs font-black text-sky-700 transition hover:bg-sky-100"
            >
              <FileText className="h-4 w-4" />
              PDF
            </a>

            <DeleteAssessmentAnalysisButton
              analysisId={analysis.id}
              title={analysis.title}
            />
          </div>
        </article>
      ))}
    </section>
  );
}