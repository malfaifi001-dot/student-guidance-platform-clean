"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Edit3, Eye, Link2, Loader2, Printer, Trash2 } from "lucide-react";
import { PerformanceItemLinkPopCard } from "@/components/performance-links/performance-item-link-pop-card";
import { PrintExportPopCard } from "@/components/print-export/print-export-pop-card";
import { usePrintExportAction } from "@/components/print-export/use-print-export-action";
import { SmartActionModal } from "@/components/ui/smart-action-modal";
import { getAssessmentAudienceLabels } from "@/lib/students/student-audience-labels";
import { ExpandableActionMenu } from "@/components/actions/expandable-action-menu";

type Analysis = {
  id: string;
  title: string;
  uploadMode: string;
  totalStudents: number;
  averagePercentage: number | null;
  updatedAt: string;
};

type ServiceLink = {
  id: string;
  performanceItemKey: string;
  targetSectionKey?: string | null;
  sourceReferenceJson?: Record<string, unknown> | null;
};

const labels: Record<string, string> = {
  NAFS: "اختبار نافس",
  NAFS_PRE_POST: "اختبار نافس",
  MAHIROON: "اختبار ماهرون",
  SUBJECT_PERIODIC: "تحليل فصلي لمادة",
};

export function AssessmentsCenterHome({ gender }: { gender?: string | null }) {
  const audience = getAssessmentAudienceLabels(gender);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [links, setLinks] = useState<ServiceLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkAnalysis, setLinkAnalysis] = useState<Analysis | null>(null);
  const [deleteAnalysis, setDeleteAnalysis] = useState<Analysis | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const print = usePrintExportAction();

  async function load() {
    setLoading(true);
    try {
      const [analysisResponse, linkResponse] = await Promise.all([
        fetch("/api/dashboard/assessments-center", { cache: "no-store" }),
        fetch("/api/dashboard/performance-links?serviceSlug=assessment-center&roleContext=TEACHER", { cache: "no-store" }),
      ]);
      const analysisPayload = await analysisResponse.json();
      const linkPayload = await linkResponse.json();
      if (analysisResponse.ok && analysisPayload.success) setAnalyses(analysisPayload.analyses || []);
      if (linkResponse.ok) setLinks(Array.isArray(linkPayload.links) ? linkPayload.links : []);
    } catch {
      setAnalyses([]);
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const linkByAnalysis = useMemo(() => {
    const result = new Map<string, ServiceLink>();
    for (const link of links) {
      const analysisId = typeof link.sourceReferenceJson?.analysisId === "string" ? link.sourceReferenceJson.analysisId : "";
      if (analysisId) result.set(analysisId, link);
    }
    return result;
  }, [links]);

  async function deleteSelectedAnalysis() {
    if (!deleteAnalysis || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError("");

    try {
      const response = await fetch(`/api/dashboard/assessments-center/${encodeURIComponent(deleteAnalysis.id)}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "تعذر حذف التحليل.");

      const deletedId = deleteAnalysis.id;
      setAnalyses((current) => current.filter((analysis) => analysis.id !== deletedId));
      setLinks((current) => current.filter((link) => link.sourceReferenceJson?.analysisId !== deletedId));
      setDeleteAnalysis(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "تعذر حذف التحليل.");
    } finally {
      setDeleteBusy(false);
    }
  }

  const counts = {
    total: analyses.length,
    nafs: analyses.filter((item) => item.uploadMode === "NAFS" || item.uploadMode === "NAFS_PRE_POST").length,
    mah: analyses.filter((item) => item.uploadMode === "MAHIROON").length,
    subject: analyses.filter((item) => item.uploadMode === "SUBJECT_PERIODIC").length,
  };

  return <main dir="rtl" className="space-y-5 sm:space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-teal-700 via-cyan-700 to-blue-700 px-4 py-4 text-white shadow-md md:px-5">
      <div><p className="font-bold text-cyan-100">Teachix</p><h1 className="mt-2 text-4xl font-black">{audience.resultsTitle}</h1><p className="mt-3 max-w-2xl font-bold leading-8 text-cyan-50">{audience.newAnalysis}، راجع النتائج السابقة، واستخرج تقريرًا تعليميًا قابلًا للطباعة.</p></div>
      <Link href="/dashboard/assessments-center/new" className="rounded-2xl bg-white px-6 py-3 font-black text-teal-700">تحليل جديد</Link>
    </header>

    <section className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 lg:grid-cols-4">
      {[["إجمالي التحليلات", counts.total], ["تحليلات نافس", counts.nafs], ["تحليلات ماهرون", counts.mah], ["التحاليل الفصلية", counts.subject]].map(([label, value]) => <div key={String(label)} className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900"><span className="text-[11px] font-bold text-slate-500">{label}</span><strong className="mt-0.5 block text-lg font-black text-teal-700">{value}</strong></div>)}
    </section>

    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black text-teal-700">الخدمات الإضافية</p><h2 className="text-2xl font-black">التحاليل المحفوظة</h2></div><Link href="/dashboard/assessments-center/new" className="text-sm font-black text-blue-700">إنشاء تحليل</Link></div>
      {loading ? <p className="flex items-center justify-center gap-2 py-8 font-bold text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> جارٍ التحميل...</p> : analyses.length === 0 ? <div className="py-8 text-center"><p className="text-lg font-black">لا توجد تحليلات محفوظة</p><p className="mt-1 text-sm font-bold text-slate-500">ابدأ بإنشاء تحليل جديد لنتائج الطلاب.</p></div> : <div className="mt-3 grid gap-3 md:grid-cols-2">{analyses.map((analysis) => { const existingLink = linkByAnalysis.get(analysis.id) || null; return <article key={analysis.id} className="relative rounded-xl border border-slate-200 bg-slate-50/70 p-3 shadow-sm transition hover:border-cyan-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-cyan-700"><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><span className="inline-flex rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-black text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">{labels[analysis.uploadMode] || analysis.uploadMode}</span><p className="mt-1 text-xs font-bold text-slate-400">{new Date(analysis.updatedAt).toLocaleDateString("ar-SA")}</p></div><ExpandableActionMenu menuId={`assessment-analysis:${analysis.id}`} overlayStrip><Link href={`/dashboard/assessments-center/${analysis.id}?mode=edit`} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-800"><Edit3 className="h-4 w-4" />تعديل</Link><button type="button" onClick={() => void print.runPrintExport({ exportUrl: `/api/dashboard/assessments-center/${analysis.id}/export/pdf`, printUrl: `/dashboard/assessments-center/${analysis.id}/print?print=1`, fileName: `${analysis.title || "تحليل نتائج"}.pdf`, blockedTitle: "معاينة التقرير" })} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-teal-50 px-3 py-2 text-xs font-black text-teal-700 disabled:opacity-60" disabled={print.status === "loading"}><Printer className="h-4 w-4" />تحميل</button><button type="button" onClick={() => setLinkAnalysis(analysis)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-xs font-black text-sky-700"><Link2 className="h-4 w-4" />{existingLink ? "تعديل الربط" : "ربط"}</button><button type="button" onClick={() => { setDeleteError(""); setDeleteAnalysis(analysis); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-700"><Trash2 className="h-4 w-4" />حذف</button></ExpandableActionMenu></div><h3 className="mt-2 truncate text-base font-black text-slate-950 dark:text-white">{analysis.title}</h3><p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">عدد الطلاب: {analysis.totalStudents} · آخر متوسط: {analysis.averagePercentage ?? "-"}%</p><Link href={`/dashboard/assessments-center/${analysis.id}/print`} className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-black text-white transition hover:bg-cyan-700"><Eye className="h-4 w-4" />معاينة</Link>{existingLink ? <p className="mt-2 text-xs font-black text-emerald-700 dark:text-emerald-300">مرتبط بملف الإنجاز</p> : null}</article>; })}</div>}
    </section>
    <PrintExportPopCard modal={print.modal} onClose={print.closeModal} onOpenFallback={(fallback) => void print.openFallbackPrintUrl(fallback)} />
    {linkAnalysis ? <PerformanceItemLinkPopCard open serviceSlug="assessment-center" roleContext="TEACHER" resourceType="ASSESSMENT_ANALYSIS" sourceReference={{ analysisId: linkAnalysis.id }} displayTitle={linkAnalysis.title} existingLink={linkByAnalysis.get(linkAnalysis.id) || null} onClose={() => setLinkAnalysis(null)} onSaved={() => { setLinkAnalysis(null); void load(); }} /> : null}
    <SmartActionModal open={Boolean(deleteAnalysis)} title="حذف التحليل؟" description={deleteError || "سيتم حذف التحليل المحفوظ وبياناته المرتبطة بهذا السجل. لا يمكن التراجع عن هذا الإجراء."} variant="danger" confirmLabel="حذف" cancelLabel="إلغاء" loading={deleteBusy} onConfirm={() => void deleteSelectedAnalysis()} onClose={() => !deleteBusy && setDeleteAnalysis(null)} />
  </main>;
}
