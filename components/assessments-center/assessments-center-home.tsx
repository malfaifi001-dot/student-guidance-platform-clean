"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Link2, Loader2, Printer } from "lucide-react";
import { PerformanceItemLinkPopCard } from "@/components/performance-links/performance-item-link-pop-card";
import { PrintExportPopCard } from "@/components/print-export/print-export-pop-card";
import { usePrintExportAction } from "@/components/print-export/use-print-export-action";

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

export function AssessmentsCenterHome() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [links, setLinks] = useState<ServiceLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkAnalysis, setLinkAnalysis] = useState<Analysis | null>(null);
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

  const counts = {
    total: analyses.length,
    nafs: analyses.filter((item) => item.uploadMode === "NAFS" || item.uploadMode === "NAFS_PRE_POST").length,
    mah: analyses.filter((item) => item.uploadMode === "MAHIROON").length,
    subject: analyses.filter((item) => item.uploadMode === "SUBJECT_PERIODIC").length,
  };

  return <main dir="rtl" className="mx-auto max-w-7xl space-y-6 p-6">
    <header className="flex flex-wrap items-end justify-between gap-6 rounded-[2rem] bg-gradient-to-br from-teal-700 via-cyan-700 to-blue-700 p-8 text-white shadow-xl">
      <div><p className="font-bold text-cyan-100">Teachix</p><h1 className="mt-2 text-4xl font-black">تحليل نتائج الطلاب</h1><p className="mt-3 max-w-2xl font-bold leading-8 text-cyan-50">أنشئ تحليلاً جديدًا، راجع النتائج السابقة، واستخرج تقريرًا تعليميًا قابلًا للطباعة.</p></div>
      <Link href="/dashboard/assessments-center/new" className="rounded-2xl bg-white px-6 py-3 font-black text-teal-700">تحليل جديد</Link>
    </header>

    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[["إجمالي التحليلات", counts.total], ["تحليلات نافس", counts.nafs], ["تحليلات ماهرون", counts.mah], ["التحاليل الفصلية", counts.subject]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border bg-white p-5 shadow-sm"><span className="text-sm font-bold text-slate-500">{label}</span><strong className="mt-2 block text-3xl font-black text-teal-700">{value}</strong></div>)}
    </section>

    <section className="rounded-3xl border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black text-teal-700">الخدمات الإضافية</p><h2 className="text-2xl font-black">التحاليل المحفوظة</h2></div><Link href="/dashboard/assessments-center/new" className="text-sm font-black text-blue-700">إنشاء تحليل</Link></div>
      {loading ? <p className="flex items-center justify-center gap-2 py-12 font-bold text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> جارٍ التحميل...</p> : analyses.length === 0 ? <div className="py-16 text-center"><p className="text-xl font-black">لا توجد تحليلات محفوظة</p><p className="mt-2 font-bold text-slate-500">ابدأ بإنشاء تحليل جديد لنتائج الطلاب.</p><Link href="/dashboard/assessments-center/new" className="mt-5 inline-flex rounded-xl bg-teal-700 px-5 py-3 font-black text-white">تحليل جديد</Link></div> : <div className="mt-5 grid gap-4 md:grid-cols-2">{analyses.map((analysis) => { const existingLink = linkByAnalysis.get(analysis.id) || null; return <article key={analysis.id} className="rounded-2xl border border-slate-200 p-5"><div className="flex items-start justify-between gap-3"><div><span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">{labels[analysis.uploadMode] || analysis.uploadMode}</span><h3 className="mt-3 text-lg font-black">{analysis.title}</h3></div><span className="text-xs font-bold text-slate-400">{new Date(analysis.updatedAt).toLocaleDateString("ar-SA")}</span></div><p className="mt-3 text-sm font-bold text-slate-500">عدد الطلاب: {analysis.totalStudents} · آخر متوسط: {analysis.averagePercentage ?? "-"}%</p><div className="mt-4 flex flex-wrap gap-2"><Link href={`/dashboard/assessments-center/${analysis.id}`} className="inline-flex rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">عرض التحليل</Link><button type="button" onClick={() => void print.runPrintExport({ printUrl: `/dashboard/assessments-center/${analysis.id}/print?print=1`, fileName: `${analysis.title || "تحليل نتائج"}.pdf`, blockedTitle: "معاينة التقرير" })} className="inline-flex items-center gap-2 rounded-xl bg-teal-50 px-4 py-2 text-sm font-black text-teal-700 disabled:opacity-60" disabled={print.status === "loading"}><Printer className="h-4 w-4" />تحميل التقرير</button><button type="button" onClick={() => setLinkAnalysis(analysis)} className="inline-flex items-center gap-2 rounded-xl bg-sky-50 px-4 py-2 text-sm font-black text-sky-700"><Link2 className="h-4 w-4" />{existingLink ? "تعديل الربط" : "ربط"}</button></div>{existingLink ? <p className="mt-3 text-xs font-black text-emerald-700">مرتبط بملف الإنجاز</p> : null}</article>; })}</div>}
    </section>
    <PrintExportPopCard modal={print.modal} onClose={print.closeModal} onOpenFallback={(fallback) => void print.openFallbackPrintUrl(fallback)} />
    {linkAnalysis ? <PerformanceItemLinkPopCard open serviceSlug="assessment-center" roleContext="TEACHER" resourceType="ASSESSMENT_ANALYSIS" sourceReference={{ analysisId: linkAnalysis.id }} displayTitle={linkAnalysis.title} existingLink={linkByAnalysis.get(linkAnalysis.id) || null} onClose={() => setLinkAnalysis(null)} onSaved={() => { setLinkAnalysis(null); void load(); }} /> : null}
  </main>;
}
