import Link from "next/link";
import { BarChart3, Eye, GitCompareArrows, Search } from "lucide-react";
import { ExpandableActionMenu } from "@/components/actions/expandable-action-menu";
import { NativeDownloadLink } from "@/components/downloads/native-download-link";
import { DeleteAssessmentAnalysisButton } from "./delete-assessment-analysis-button";
import { AssessmentCreateAnalysisPopCard } from "./assessment-create-analysis-pop-card";

type AssessmentDashboardAnalysis = {
  id: string;
  title: string;
  totalStudents: number;
  averagePercentage?: number | null;
  createdAt: Date;
};

function formatDate(value: Date) {
  return value.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}

export function AssessmentCenterDashboard({
  analyses = [],
  totalCount = 0,
  studentLabel = "الطلاب",
}: {
  analyses?: AssessmentDashboardAnalysis[];
  totalCount?: number;
  studentLabel?: string;
}) {
  return <main className="space-y-5 sm:space-y-6" dir="rtl">
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-sky-900 via-sky-800 to-indigo-700 p-5 text-white shadow-md sm:p-6">
      <span className="pointer-events-none absolute inset-y-0 start-0 w-1 bg-white/35" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20"><BarChart3 className="h-4 w-4" /></span><h1 className="text-2xl font-black leading-tight sm:text-3xl">تحليل نتائج {studentLabel}</h1></div>
        <AssessmentCreateAnalysisPopCard />
      </div>
    </section>

    <section className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"><span>التحليلات: <b className="text-slate-950 dark:text-white">{totalCount}</b></span><span>جاهزة: <b className="text-slate-950 dark:text-white">{analyses.length}</b></span></section>

    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-black text-slate-950 dark:text-white">آخر التحليلات</h2><Link href="/dashboard/assessment-center/compare" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><GitCompareArrows className="h-4 w-4" />مقارنة</Link></div>
      {analyses.length ? <div className="divide-y divide-slate-200 dark:divide-slate-800">{analyses.map((analysis) => <article key={analysis.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 transition hover:bg-slate-50/70 dark:hover:bg-slate-950/70 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/50">جاهز</span><h3 className="truncate text-sm font-black text-slate-950 dark:text-white sm:text-base">{analysis.title}</h3></div><p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{formatDate(analysis.createdAt)} · {analysis.totalStudents} {studentLabel} · {analysis.averagePercentage == null ? "—" : `${Math.round(analysis.averagePercentage)}%`}</p></div><div className="flex items-center gap-2"><Link href={`/dashboard/assessment-center/${analysis.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-sky-700 px-4 py-2 text-xs font-black text-white transition hover:bg-sky-800"><span>فتح</span></Link><ExpandableActionMenu menuId={`assessment-analysis:${analysis.id}`} overlayStrip className="self-center" stripClassName="rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"><Link href={`/dashboard/assessment-center/${analysis.id}/print`} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"><Eye className="h-4 w-4" />معاينة التقرير</Link><NativeDownloadLink href={`/api/dashboard/assessment-center/${analysis.id}/export?format=excel`} fileName={`${analysis.title || "analysis"}.xlsx`} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">Excel</NativeDownloadLink><Link href={`/dashboard/assessment-center/compare?first=${analysis.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">مقارنة</Link><DeleteAssessmentAnalysisButton analysisId={analysis.id} title={analysis.title} /></ExpandableActionMenu></div></article>)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center dark:border-slate-700 dark:bg-slate-950"><div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800"><Search className="h-5 w-5" /></div><h3 className="mt-3 text-lg font-black text-slate-800 dark:text-slate-100">لا توجد تحليلات بعد</h3><p className="mt-1 text-xs font-bold leading-6 text-slate-500 dark:text-slate-400">ابدأ بإنشاء تحليل جديد، وسيظهر هنا مباشرة.</p></div>}
    </section>
  </main>;
}
