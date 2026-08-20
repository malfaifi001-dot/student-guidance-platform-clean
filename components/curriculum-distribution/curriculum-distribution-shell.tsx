"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpenCheck, ChevronDown, Eye, Loader2, Printer, Search } from "lucide-react";
import { PrintExportPopCard } from "@/components/print-export/print-export-pop-card";
import { usePrintExportAction } from "@/components/print-export/use-print-export-action";
import { CurriculumDistributionMobilePreview } from "@/components/curriculum-distribution/curriculum-distribution-mobile-preview";
import { CurriculumWeekCard } from "@/components/curriculum-distribution/curriculum-week-card";
import { getCurriculumCalendarItems } from "@/lib/curriculum-distribution/calendar";
import { isNativeCapacitor } from "@/lib/native/native-runtime";
import type { CurriculumDistribution, CurriculumOption } from "@/lib/curriculum-distribution/types";

type Choice = CurriculumOption & { isExtra?: boolean };
type Options = { stages: Choice[]; childStages: Choice[]; tracks: Choice[]; grades: Choice[]; semesters: Choice[]; subjects: Choice[] };
type SelectionField = { key: string; label: string; value: Choice | null; choices: Choice[]; onChange: (value: Choice | null) => void | Promise<void> };
const emptyOptions: Options = { stages: [], childStages: [], tracks: [], grades: [], semesters: [], subjects: [] };

async function loadOptions(kind: string, params: Record<string, string>) {
  const query = new URLSearchParams({ kind, ...params });
  const response = await fetch(`/api/dashboard/curriculum-distribution?${query}`);
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || "تعذر تحميل البيانات");
  return json.data as Choice[];
}

export function CurriculumDistributionShell() {
  const [stage, setStage] = useState<Choice | null>(null);
  const [childStage, setChildStage] = useState<Choice | null>(null);
  const [track, setTrack] = useState<Choice | null>(null);
  const [grade, setGrade] = useState<Choice | null>(null);
  const [semester, setSemester] = useState<Choice | null>(null);
  const [subject, setSubject] = useState<Choice | null>(null);
  const [options, setOptions] = useState<Options>(emptyOptions);
  const [distribution, setDistribution] = useState<CurriculumDistribution | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const requestVersion = useRef(0);
  const print = usePrintExportAction();

  function getPrintUrl() {
    if (!distribution) return "";
    return `/print/curriculum-distribution?stageId=${distribution.stage.id}&gradeId=${distribution.grade.id}&semesterId=${distribution.semester.id}&subjectId=${distribution.subject.id}`;
  }

  async function downloadDistributionPdf() {
    if (!distribution) return false;

    const result = await print.runPrintExport({
      exportUrl: "/api/dashboard/curriculum-distribution/export/pdf",
      method: "POST",
      body: {
        subjectId: distribution.subject.id,
        semesterId: distribution.semester.id,
        fileName: "curriculum-distribution.pdf",
      },
      printUrl: getPrintUrl(),
      fileName: "curriculum-distribution.pdf",
      blockedTitle: "معاينة الطباعة",
      blockedMessage: "تم حظر فتح نافذة المعاينة تلقائيًا. استخدم الزر أدناه لفتح مستند الطباعة.",
    });

    return result === "downloaded";
  }

  function openDistributionPreview() {
    if (!distribution) return;

    if (isNativeCapacitor()) {
      setMobilePreviewOpen(true);
      return;
    }

    void downloadDistributionPdf();
  }

  useEffect(() => {
    const version = ++requestVersion.current;
    loadOptions("stages", {}).then((data) => {
      if (version === requestVersion.current) setOptions((old) => ({ ...old, stages: data }));
    }).catch((reason: unknown) => {
      if (version === requestVersion.current) setError(reason instanceof Error ? reason.message : "تعذر تحميل المراحل");
    });
  }, []);

  function resetBelowStage() {
    setChildStage(null); setTrack(null); setGrade(null); setSemester(null); setSubject(null); setDistribution(null);
    setOptions((old) => ({ ...old, childStages: [], tracks: [], grades: [], semesters: [], subjects: [] }));
  }

  async function handleStage(nextStage: Choice | null) {
    const version = ++requestVersion.current;
    setStage(nextStage); resetBelowStage(); setError("");
    if (!nextStage) return;
    setLoading(true);
    try {
      const tracks = await loadOptions("tracks", { stageId: nextStage.id });
      if (version !== requestVersion.current) return;
      setOptions((old) => ({ ...old, tracks }));
      if (tracks.length) return;
      const childStages = await loadOptions("child-stages", { parentId: nextStage.id });
      if (version !== requestVersion.current) return;
      setOptions((old) => ({ ...old, childStages }));
      if (childStages.length) return;
      const grades = await loadOptions("grades", { stageId: nextStage.id });
      if (version === requestVersion.current) setOptions((old) => ({ ...old, grades }));
    } catch (reason: unknown) {
      if (version === requestVersion.current) setError(reason instanceof Error ? reason.message : "تعذر تحميل المرحلة");
    } finally { if (version === requestVersion.current) setLoading(false); }
  }

  async function handleTrack(nextTrack: Choice | null) {
    const version = ++requestVersion.current;
    setTrack(nextTrack); setGrade(null); setSemester(null); setSubject(null); setDistribution(null);
    setOptions((old) => ({ ...old, grades: [], semesters: [], subjects: [] })); setError("");
    if (!nextTrack || !stage) return;
    setLoading(true);
    try {
      const grades = await loadOptions("grades", { stageId: stage.id, trackId: nextTrack.id });
      if (version === requestVersion.current) setOptions((old) => ({ ...old, grades }));
    } catch (reason: unknown) {
      if (version === requestVersion.current) setError(reason instanceof Error ? reason.message : "تعذر تحميل الصفوف");
    } finally { if (version === requestVersion.current) setLoading(false); }
  }

  async function handleChildStage(nextChildStage: Choice | null) {
    const version = ++requestVersion.current;
    setChildStage(nextChildStage); setGrade(null); setSemester(null); setSubject(null); setDistribution(null);
    setOptions((old) => ({ ...old, grades: [], semesters: [], subjects: [] })); setError("");
    if (!nextChildStage) return;
    setLoading(true);
    try {
      const grades = await loadOptions("grades", { stageId: nextChildStage.id });
      if (version === requestVersion.current) setOptions((old) => ({ ...old, grades }));
    } catch (reason: unknown) {
      if (version === requestVersion.current) setError(reason instanceof Error ? reason.message : "تعذر تحميل الصفوف");
    } finally { if (version === requestVersion.current) setLoading(false); }
  }

  async function handleGrade(nextGrade: Choice | null) {
    const version = ++requestVersion.current;
    setGrade(nextGrade); setSemester(null); setSubject(null); setDistribution(null);
    setOptions((old) => ({ ...old, semesters: [], subjects: [] })); setError("");
    if (!nextGrade) return;
    setLoading(true);
    try {
      const semesters = await loadOptions("semesters", { gradeId: nextGrade.id });
      if (version === requestVersion.current) setOptions((old) => ({ ...old, semesters }));
    } catch (reason: unknown) {
      if (version === requestVersion.current) setError(reason instanceof Error ? reason.message : "تعذر تحميل الفصول");
    } finally { if (version === requestVersion.current) setLoading(false); }
  }

  async function handleSemester(nextSemester: Choice | null) {
    const version = ++requestVersion.current;
    setSemester(nextSemester); setSubject(null); setDistribution(null); setOptions((old) => ({ ...old, subjects: [] })); setError("");
    if (!nextSemester) return;
    setLoading(true);
    try {
      const subjects = await loadOptions("subjects", { semesterId: nextSemester.id });
      if (version === requestVersion.current) setOptions((old) => ({ ...old, subjects }));
    } catch (reason: unknown) {
      if (version === requestVersion.current) setError(reason instanceof Error ? reason.message : "تعذر تحميل المواد");
    } finally { if (version === requestVersion.current) setLoading(false); }
  }

  async function showDistribution() {
    if (!subject || !semester) return;
    const version = ++requestVersion.current;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/dashboard/curriculum-distribution?kind=distribution&subjectId=${encodeURIComponent(subject.id)}&semesterId=${encodeURIComponent(semester.id)}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "تعذر تحميل التوزيع");
      if (version === requestVersion.current) setDistribution(json.distribution as CurriculumDistribution);
    } catch (reason: unknown) {
      if (version === requestVersion.current) setError(reason instanceof Error ? reason.message : "تعذر تحميل التوزيع");
    } finally { if (version === requestVersion.current) setLoading(false); }
  }

  const hasTracks = Boolean(stage && options.tracks.length);
  const hasChildStages = Boolean(stage && options.childStages.length);
  const gradeReady = Boolean(stage && (!hasTracks || track) && (!hasChildStages || childStage) && options.grades.length);
  const semesterReady = Boolean(grade && options.semesters.length);
  const subjectReady = Boolean(semester && options.subjects.length);
  const fields: SelectionField[] = [
    { key: "stage", label: "المرحلة", value: stage, choices: options.stages, onChange: handleStage },
    ...(hasChildStages ? [{ key: "childStage", label: "المرحلة الفرعية", value: childStage, choices: options.childStages, onChange: handleChildStage }] : []),
    ...(hasTracks ? [{ key: "track", label: "المسار", value: track, choices: options.tracks, onChange: handleTrack }] : []),
    ...(gradeReady ? [{ key: "grade", label: "الصف / السنة", value: grade, choices: options.grades, onChange: handleGrade }] : []),
    ...(semesterReady ? [{ key: "semester", label: "الفصل الدراسي", value: semester, choices: options.semesters, onChange: handleSemester }] : []),
    ...(subjectReady ? [{ key: "subject", label: "المادة", value: subject, choices: options.subjects, onChange: (value: Choice | null) => { ++requestVersion.current; setSubject(value); setDistribution(null); } }] : []),
  ];

  return (
    <div dir="rtl" className="space-y-5">
      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-4">
          <div><h2 className="text-lg font-black text-slate-950">اختيارات العرض</h2><p className="mt-1 text-xs font-bold text-slate-500">حدد المسار الأكاديمي لعرض الوحدات والدروس المناسبة.</p></div>
          {loading ? <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-black text-sky-700"><Loader2 className="h-3.5 w-3.5 animate-spin" />جارٍ تحميل الخيارات</span> : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {fields.map((field) => <label key={field.key} className="min-w-0 space-y-2"><span className="block text-xs font-black text-slate-600">{field.label}</span><span className="relative block"><select disabled={loading} value={field.value?.id || ""} onChange={(event) => { const value = field.choices.find((item) => item.id === event.target.value) || null; void field.onChange(value); }} className="min-h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 pe-10 text-sm font-black text-slate-800 outline-none transition hover:border-sky-300 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 disabled:cursor-wait disabled:opacity-60"><option value="">اختر {field.label}</option>{field.choices.map((item) => <option key={item.id} value={item.id}>{item.name}{item.isExtra ? " (إضافية)" : ""}</option>)}</select><ChevronDown className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /></span></label>)}
        </div>
        {error ? <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
        <div className="mt-5 flex flex-col items-stretch justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center"><p className="text-sm font-bold text-slate-500">{subject ? "أصبحت الخطة جاهزة للعرض." : "أكمل الاختيارات لعرض التوزيع."}</p><div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><button disabled={!subject || loading} onClick={showDistribution} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}{loading ? "جارٍ التحميل" : "عرض التوزيع"}</button>{distribution ? <button disabled={print.status === "loading"} onClick={openDistributionPreview} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-100 disabled:cursor-wait disabled:opacity-60">{isNativeCapacitor() ? <Eye className="h-4 w-4" /> : <Printer className="h-4 w-4" />}معاينة وتحميل</button> : null}</div></div>
      </section>
      {distribution ? <DistributionView distribution={distribution} /> : <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-7 text-center"><BookOpenCheck className="mx-auto h-7 w-7 text-sky-500" /><p className="mt-2 text-sm font-black text-slate-600">{subject ? "جاهز لعرض توزيع المنهج." : "اختر المادة لعرض توزيع المنهج."}</p></div>}
      <PrintExportPopCard modal={print.modal} onClose={print.closeModal} onOpenFallback={(fallback) => void print.openFallbackPrintUrl(fallback)} />
      <CurriculumDistributionMobilePreview
        open={mobilePreviewOpen}
        previewUrl={getPrintUrl()}
        onDownload={downloadDistributionPdf}
        onClose={() => setMobilePreviewOpen(false)}
      />
    </div>
  );
}

export function DistributionView({ distribution }: { distribution: CurriculumDistribution }) {
  const calendarItems = getCurriculumCalendarItems(distribution.weeks);
  const summary = [["المرحلة", distribution.stage.name], distribution.track ? ["المسار", distribution.track.name] : null, ["الصف / السنة", distribution.grade.name], ["الفصل", distribution.semester.name], ["المادة", distribution.subject.name]].filter((item): item is [string, string] => Boolean(item));
  return <section className="space-y-4" dir="rtl"><div className="rounded-[1.75rem] bg-gradient-to-br from-sky-900 via-sky-800 to-cyan-700 p-4 text-white shadow-lg shadow-sky-900/10 md:p-5"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{summary.map(([label, value]) => <div key={label} className="min-w-0 rounded-2xl bg-white/10 p-3 ring-1 ring-white/10"><span className="block text-[11px] font-bold text-white/65">{label}</span><strong className="mt-1 block truncate text-sm font-black text-white" title={value}>{value}</strong></div>)}</div></div><div className="grid gap-4 md:grid-cols-2">{calendarItems.map((item) => <CurriculumWeekCard key={item.id} item={item} />)}</div></section>;
}
