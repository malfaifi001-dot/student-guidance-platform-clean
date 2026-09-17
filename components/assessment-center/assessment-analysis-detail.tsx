import {
  BarChart3,
  FileSpreadsheet,
  Lightbulb,
  UsersRound,
} from "lucide-react";
import type {
  AssessmentAnalysisSummary,
  AssessmentResultRow,
} from "@/lib/assessment-center/assessment-center-types";
import { AssessmentAnalysisReadingPanel } from "./assessment-analysis-reading-panel";
import { AssessmentReportOptionsPopCard } from "./assessment-report-options-pop-card";

type Props = {
  analysis: {
    id: string;
    title: string;
    sourceFile?: string | null;
    totalStudents: number;
    totalRows: number;
    totalSubjects: number;
    averagePercentage?: number | null;
    createdAt: Date;
    summaryJson?: unknown;
    rowsJson?: unknown;
  };
};

function asSummary(value: unknown): AssessmentAnalysisSummary | null {
  if (!value || typeof value !== "object") return null;
  return value as AssessmentAnalysisSummary;
}

function asRows(value: unknown): AssessmentResultRow[] {
  if (!Array.isArray(value)) return [];
  return value as AssessmentResultRow[];
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: typeof UsersRound;
}) {
  return (
    <article className="min-h-[84px] rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black leading-4 text-slate-400">{label}</p>
          <p className="mt-1.5 text-2xl font-black leading-tight text-slate-950 dark:text-white">{value}</p>
        </div>

        <div className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-300">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </article>
  );
}

export function AssessmentAnalysisDetail({ analysis }: Props) {
  const summary = asSummary(analysis.summaryJson);
  const rows = asRows(analysis.rowsJson);

  const kpis = [
    {
      label: "الطلاب",
      value: analysis.totalStudents,
      icon: UsersRound,
    },
    {
      label: "المواد",
      value: analysis.totalSubjects,
      icon: FileSpreadsheet,
    },
    {
      label: "المتوسط",
      value: `${Math.round(Number(analysis.averagePercentage || 0))}%`,
      icon: BarChart3,
    },
    {
      label: "يحتاجون متابعة",
      value: summary?.riskStudentsCount || 0,
      icon: Lightbulb,
    },
  ];

  return (
    <main className="space-y-5 sm:space-y-6">
      <section className="rounded-3xl bg-gradient-to-l from-sky-900 via-sky-800 to-indigo-700 p-5 text-white shadow-md sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><h1 className="text-2xl font-black leading-tight sm:text-3xl">{analysis.title}</h1><p className="mt-2 text-xs font-bold leading-6 text-cyan-50/90 sm:text-sm">
          {analysis.sourceFile || "ملف غير محدد"} •{" "}
          {analysis.createdAt.toLocaleDateString("ar-SA")}
        </p></div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <a href={`/dashboard/assessment-center/${analysis.id}/print`} className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-white px-4 text-sm font-black text-sky-900 shadow-sm transition hover:bg-sky-50 sm:w-auto">معاينة التقرير</a>
            <AssessmentReportOptionsPopCard analysisId={analysis.id} triggerClassName="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-white/25 bg-white/15 px-4 text-xs font-black text-white transition hover:bg-white/20 sm:flex-none" />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((item) => (
          <MetricCard
            key={item.label}
            label={item.label}
            value={item.value}
            icon={item.icon}
          />
        ))}
      </section>

      <AssessmentAnalysisReadingPanel rows={rows} summary={summary} />
    </main>
  );
}
