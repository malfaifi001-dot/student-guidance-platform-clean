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
import { AssessmentAnalysisExportActions } from "./assessment-analysis-export-actions";
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
    <article className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[8px] font-black leading-4 text-slate-400">{label}</p>
          <p className="mt-2 text-[28px] font-black leading-tight text-slate-950 dark:text-white">{value}</p>
        </div>

        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-50 text-cyan-600">
          <Icon className="h-6 w-6" />
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
      <section className="rounded-3xl bg-gradient-to-l from-sky-900 via-sky-800 to-indigo-700 p-5 text-white shadow-md sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-2xl font-black leading-tight sm:text-3xl">
            {analysis.title}
          </h1>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <AssessmentReportOptionsPopCard analysisId={analysis.id} />
            <a href={`/dashboard/assessment-center/${analysis.id}/print`} className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-black text-sky-900 shadow-sm transition hover:bg-sky-50">معاينة التقرير</a>
            <AssessmentAnalysisExportActions analysisId={analysis.id} analysisTitle={analysis.title} />
          </div>
        </div>

        <p className="mt-4 text-sm font-bold leading-7 text-cyan-50/90">
          {analysis.sourceFile || "ملف غير محدد"} •{" "}
          {analysis.createdAt.toLocaleDateString("ar-SA")}
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
