import Link from "next/link";
import {
  ArrowUpLeft,
  FileSpreadsheet,
  FileText,
  GitCompareArrows,
  SearchX,
} from "lucide-react";
import {
  getGradeBand,
  getGradeBandLabel,
} from "@/lib/assessment-center/assessment-analysis-summary";
import { DeleteAssessmentAnalysisButton } from "./delete-assessment-analysis-button";
import { NativeDownloadLink } from "@/components/downloads/native-download-link";
import { ExpandableActionMenu } from "@/components/actions/expandable-action-menu";

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

function getWeakCount(summaryJson: unknown) {
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

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(value);
}

export function AssessmentAnalysesList({
  analyses,
}: {
  analyses: AssessmentAnalysisItem[];
}) {
  if (analyses.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-slate-50 text-slate-400 dark:bg-slate-800">
          <SearchX className="h-8 w-8" />
        </div>

        <h2 className="mt-3 text-xl font-black text-slate-950 dark:text-white">
          لا توجد تحليلات
        </h2>

        <Link
          href="/dashboard/assessment-center/new"
          className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-cyan-700"
        >
          رفع تحليل جديد
          <ArrowUpLeft className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {analyses.map((analysis) => {
        const weakCount = getWeakCount(analysis.summaryJson);
        const generalBand = getGradeBandLabel(getGradeBand(analysis.averagePercentage));

        return (
          <article
            key={analysis.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-100 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-black text-slate-950 dark:text-white">
                    {analysis.title}
                  </h2>

                  <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                    {generalBand}
                  </span>
                </div>

                <p className="mt-2 text-sm font-bold text-slate-500">
                  {formatDate(analysis.createdAt)}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-4 xl:min-w-[520px]">
                <div className="rounded-xl bg-slate-50 p-2.5 text-center dark:bg-slate-800">
                  <p className="text-[11px] font-black text-slate-400">
                    الطلاب
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                    {analysis.totalStudents}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-2.5 text-center dark:bg-slate-800">
                  <p className="text-[11px] font-black text-slate-400">
                    المواد
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                    {analysis.totalSubjects}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-2.5 text-center dark:bg-slate-800">
                  <p className="text-[11px] font-black text-slate-400">
                    المتوسط
                  </p>
                  <p className="mt-1 text-lg font-black text-cyan-700">
                    {Math.round(Number(analysis.averagePercentage || 0))}%
                  </p>
                </div>

                <div className="rounded-xl bg-rose-50 p-2.5 text-center dark:bg-rose-950/30">
                  <p className="text-[11px] font-black text-rose-400">
                    الطلاب الضعاف
                  </p>
                  <p className="mt-1 text-lg font-black text-rose-700">
                    {weakCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link
                href={`/dashboard/assessment-center/${analysis.id}`}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-cyan-700"
              >
                فتح
                <ArrowUpLeft className="h-4 w-4" />
              </Link>

              <ExpandableActionMenu menuId={`assessment-analysis:${analysis.id}`}>
              <Link
                href={`/dashboard/assessment-center/compare?first=${analysis.id}`}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <GitCompareArrows className="h-4 w-4" />
                مقارنة
              </Link>

              <NativeDownloadLink
                href={`/api/dashboard/assessment-center/${analysis.id}/export?format=excel`}
                fileName={`${analysis.title}.xlsx`}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs font-black text-emerald-700 transition hover:bg-emerald-100"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </NativeDownloadLink>

              <NativeDownloadLink
                href={`/api/dashboard/assessment-center/${analysis.id}/export?format=pdf`}
                fileName={`${analysis.title}.pdf`}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2.5 text-xs font-black text-sky-700 transition hover:bg-sky-100"
              >
                <FileText className="h-4 w-4" />
                PDF
              </NativeDownloadLink>

              <DeleteAssessmentAnalysisButton
                analysisId={analysis.id}
                title={analysis.title}
              />
              </ExpandableActionMenu>
            </div>
          </article>
        );
      })}
    </section>
  );
}
