import Link from "next/link";
import {
  ArrowRight,
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
    <article className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-slate-400">{label}</p>
          <p className="mt-3 text-4xl font-black text-slate-950">{value}</p>
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
    <main className="space-y-8">
      <section className="rounded-[2rem] border border-cyan-100 bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700 p-8 text-white shadow-2xl">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/assessment-center"
            className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-black text-cyan-50"
          >
            <ArrowRight className="h-4 w-4" />
            العودة
          </Link>

          <a
            href={`/api/dashboard/assessment-center/${analysis.id}/export?format=excel`}
            className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-black text-cyan-700 transition hover:bg-cyan-50"
          >
            Excel
          </a>

          <a
            href={`/api/dashboard/assessment-center/${analysis.id}/export?format=pdf`}
            className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/15 px-4 py-2 text-sm font-black text-white transition hover:bg-white/20"
          >
            PDF
          </a>
        </div>

        <h1 className="mt-5 text-4xl font-black leading-tight md:text-5xl">
          {analysis.title}
        </h1>

        <p className="mt-4 text-sm font-bold leading-7 text-cyan-50/90">
          {analysis.sourceFile || "ملف غير محدد"} •{" "}
          {analysis.createdAt.toLocaleDateString("ar-SA")}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
