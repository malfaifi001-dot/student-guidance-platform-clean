"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Eye, Link2, Plus, Trash2 } from "lucide-react";
import { SmartActionModal } from "@/components/ui/smart-action-modal";
import { PrintExportPopCard } from "@/components/print-export/print-export-pop-card";
import { usePrintExportAction } from "@/components/print-export/use-print-export-action";
import { CurriculumDistributionMobilePreview } from "@/components/curriculum-distribution/curriculum-distribution-mobile-preview";
import { getActivityPlanProgramByKey } from "@/lib/activity-plan/activity-plan-programs";
import { ACTIVITY_PROGRAM_DOMAINS } from "@/lib/activity-programs/activity-program-catalog";
import { ACTIVITY_PLAN_OTHER_PROGRAM_VALUE } from "@/lib/activity-plan/activity-plan-program-value";
import { ACTIVITY_PLAN_PERIODS, getPeriodLabel } from "@/lib/activity-plan/activity-plan-calendar";
import { REAL_ACTIVITY_PLAN_STAGES } from "@/lib/activity-plan/activity-plan-stages";
import { PerformanceItemLinkPopCard } from "@/components/performance-links/performance-item-link-pop-card";
import { WeeklyActivityPlanPanel } from "@/components/activity-plan/weekly-activity-plan-panel";
import { TenPercentActivityPlanPanel } from "@/components/activity-plan/ten-percent-activity-plan-panel";
import { formatActivityPlanHijriDate } from "@/lib/activity-plan/activity-plan-date-format";

type Program = { id: string; key?: string; title: string };
type Entry = {
  id: string;
  stage: string;
  dayOfWeek: number;
  periodNumber: number;
  date: string;
  gradeLabel: string;
  teacherName: string;
  domainServiceSlug?: string;
  domainKey?: string;
  displayTitle?: string;
  program: Program;
};
type WorkflowProgramOption = { value: string; label: string; isOther: boolean };
type DateItem = { dayOfWeek: number; label: string; date: string };
type Cell = { dayOfWeek: number; periodNumber: number; date: string };
type ServiceLink = { id: string; sourceKey: string; sourceReferenceJson: Record<string, unknown>; targetSectionKey?: string | null; performanceItemKey: string };

function formatDate(value: string) {
  return formatActivityPlanHijriDate(value);
}

export function ActivityPlanShell() {
  const [week, setWeek] = useState(1);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [dates, setDates] = useState<DateItem[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [gradesByStage, setGradesByStage] = useState<Record<string, string[]>>({});
  const [stages, setStages] = useState<string[]>([]);
  const [selectedStage, setSelectedStage] = useState("");
  const [mode, setMode] = useState<"detailed" | "weekly" | "ten-percent">("detailed");
  const [teachers, setTeachers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCell, setActiveCell] = useState<Cell | null>(null);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSetupOpen, setPreviewSetupOpen] = useState(false);
  const [previewStage, setPreviewStage] = useState("");
  const [previewWeekMode, setPreviewWeekMode] = useState<"all" | "selected" | "semester">("all");
  const [previewWeeks, setPreviewWeeks] = useState<number[]>([]);
  const [previewSetupError, setPreviewSetupError] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [serviceLinks, setServiceLinks] = useState<ServiceLink[]>([]);
  const print = usePrintExportAction();

  const loadWeek = async (nextWeek: number, nextStage: string) => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ week: String(nextWeek) });
      if (nextStage) query.set("stage", nextStage);
      const response = await fetch(`/api/dashboard/activity-plan?${query.toString()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "تعذر تحميل الخطة.");
      setEntries(payload.entries || []);
      setDates(payload.dates || []);
      setGrades(payload.suggestions?.grades || []);
      setGradesByStage(payload.suggestions?.gradesByStage || {});
      setTeachers(payload.suggestions?.teachers || []);
      setStages(payload.stages || []);
      setSelectedStage(payload.stage || nextStage);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل الخطة.");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadWeek(week, selectedStage); }, [week, selectedStage]);
  useEffect(() => {
    void fetch("/api/dashboard/performance-links?serviceSlug=student-activity-plan&roleContext=ACTIVITY_LEADER", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setServiceLinks(payload.links || []));
  }, [linkOpen]);

  const existingLink = serviceLinks.find((link) => link.sourceKey === "school-account") || null;

  const entryByCell = useMemo(
    () => new Map(entries.map((entry) => [`${entry.dayOfWeek}-${entry.periodNumber}`, entry])),
    [entries],
  );
  async function printActivityPlan() {
    const result = await print.runPrintExport({
      exportUrl: "/api/dashboard/activity-plan/export/pdf",
      method: "POST",
      body: { fileName: "student-activity-plan.pdf", stage: previewStage, mode, weeks: previewWeekMode === "selected" ? previewWeeks : undefined },
      printUrl: buildActivityPlanPreviewUrl(previewStage, mode, previewWeekMode, previewWeeks, true),
      fileName: "student-activity-plan.pdf",
      blockedTitle: "معاينة خطة النشاط الطلابي",
      blockedMessage: "تم حظر فتح نافذة المعاينة تلقائياً. استخدم الزر أدناه لفتح مستند الطباعة.",
    });
    return result !== "error";
  }

  function openPreviewSetup() {
    setPreviewStage(selectedStage);
    setPreviewWeekMode(mode === "weekly" || mode === "ten-percent" ? "semester" : "all");
    setPreviewWeeks([]);
    setPreviewSetupError("");
    setPreviewSetupOpen(true);
  }

  function openSelectedPreview() {
    if (!REAL_ACTIVITY_PLAN_STAGES.includes(previewStage)) {
      setPreviewSetupError("اختر مرحلة صحيحة أولاً.");
      return;
    }
    if (previewWeekMode === "selected" && previewWeeks.length === 0) {
      setPreviewSetupError("اختر أسبوعًا واحدًا على الأقل.");
      return;
    }
    setPreviewSetupOpen(false);
    setPreviewOpen(true);
  }

  return (
    <main className="space-y-4" dir="rtl">
      <section className="activity-plan-header rounded-2xl border border-sky-200 bg-gradient-to-l from-sky-800 via-cyan-700 to-sky-600 px-4 py-3 text-white shadow-sm dark:border-sky-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-black tracking-tight">خطة النشاط الطلابي</h1>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={openPreviewSetup} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-black text-sky-900 transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><Eye className="h-4 w-4" />معاينة</button>
            <button type="button" onClick={() => setLinkOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-3.5 py-2 text-sm font-black text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><Link2 className="h-4 w-4" />تعديل الربط</button>
          </div>
        </div>
      </section>

      <section className="activity-plan-controls-surface rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <ActivityPlanControls stages={stages} selectedStage={selectedStage} onStageChange={setSelectedStage} mode={mode} onModeChange={setMode} onCopy={() => setCopyOpen(true)} />
      </section>

      {mode === "detailed" ? <section className="rounded-2xl border border-sky-100 bg-sky-50/60 p-2 shadow-sm dark:border-sky-900/60 dark:bg-sky-950/20">
        <div className="flex max-w-full gap-1.5 overflow-x-auto pb-0.5" aria-label="اختيار الأسبوع">
          {Array.from({ length: 20 }, (_, index) => index + 1).map((item) => (
            <button type="button" key={item} onClick={() => setWeek(item)} aria-pressed={item === week} className={item === week ? "h-8 min-w-8 rounded-lg bg-sky-700 px-2 text-xs font-black text-white shadow-sm" : "h-8 min-w-8 rounded-lg bg-white px-2 text-xs font-bold text-slate-500 ring-1 ring-slate-200 transition hover:bg-sky-100 hover:text-sky-800 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-sky-950/50"}>{item}</button>
          ))}
        </div>
      </section> : null}

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-black text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-200">{error}</div> : null}
      {mode === "ten-percent" ? <TenPercentActivityPlanPanel stage={selectedStage} /> : <section className={`rounded-2xl border p-2 shadow-sm md:p-3 ${mode === "weekly" ? "border-blue-200 bg-blue-50/30 dark:border-blue-900/60 dark:bg-blue-950/15" : "border-sky-200 bg-sky-50/25 dark:border-sky-900/60 dark:bg-sky-950/15"}`}>
        {mode === "weekly" ? <WeeklyActivityPlanPanel stage={selectedStage} /> : <>
          <div className="overflow-x-auto overscroll-x-contain rounded-xl border border-slate-200 [scrollbar-width:thin] dark:border-slate-700" style={{ WebkitOverflowScrolling: "touch" }}>
            <div className="min-w-[1220px]">
              <div className="grid grid-cols-[140px_repeat(7,minmax(154px,1fr))] bg-sky-50/70 dark:bg-sky-950/30" dir="rtl">
                <div className="border-b border-l border-sky-100 p-3 text-sm font-black text-slate-500 dark:border-sky-900/60 dark:text-slate-300">اليوم / الحصص</div>
                {ACTIVITY_PLAN_PERIODS.map((period) => <div key={period} className="border-b border-l border-sky-100 p-3 text-center text-sm font-black text-slate-700 dark:border-sky-900/60 dark:text-slate-200">{getPeriodLabel(period)}</div>)}
              </div>
              {dates.map((day) => (
                <div key={day.dayOfWeek} className="grid grid-cols-[140px_repeat(7,minmax(154px,1fr))]" dir="rtl">
                  <div className="flex min-h-[136px] flex-col justify-center border-b border-l border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-700 dark:bg-slate-900">
                    <span className="text-sm font-black text-slate-900 dark:text-slate-100">{day.label}</span><span className="mt-1 text-xs font-bold text-sky-700 dark:text-sky-300">{formatDate(day.date)}</span>
                  </div>
                  {ACTIVITY_PLAN_PERIODS.map((period) => {
                    const entry = entryByCell.get(`${day.dayOfWeek}-${period}`);
                    const domainProgram = entry?.domainKey ? getActivityPlanProgramByKey(entry.domainKey) : null;
                    const colorClass = domainProgram?.colorClass || "";
                    return <button type="button" key={`${day.dayOfWeek}-${period}`} onClick={() => { setActiveCell({ dayOfWeek: day.dayOfWeek, periodNumber: period, date: day.date }); setEditing(entry || null); }} className="group min-h-[136px] border-b border-l border-slate-200 bg-white p-2 text-right transition hover:bg-sky-50/50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-sky-950/30">
                      {entry ? <div className={`h-full rounded-xl border p-3 ${colorClass || "border-slate-200 bg-slate-50 text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"}`}><p className="break-words whitespace-normal text-center text-[13px] font-black leading-5">{entry.displayTitle || entry.program.title}</p><p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-300">{entry.gradeLabel}</p><p className="mt-1 text-xs font-bold text-slate-600 dark:text-slate-400">{entry.teacherName}</p><span className="mt-3 block text-[10px] font-black text-sky-700 opacity-0 transition group-hover:opacity-100 dark:text-sky-300">اضغط للتعديل</span></div> : <span className="flex h-full min-h-[120px] items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs font-bold text-slate-400 transition group-hover:border-sky-300 group-hover:bg-sky-50 group-hover:text-sky-700 dark:border-slate-700 dark:text-slate-500 dark:group-hover:border-sky-700 dark:group-hover:bg-sky-950/30 dark:group-hover:text-sky-300"><Plus className="h-4 w-4" /><span className="sr-only">إضافة إدخال</span><span aria-hidden="true">إضافة</span></span>}
                    </button>;
                  })}
                </div>
              ))}
            </div>
          </div>
          {loading ? <p className="py-3 text-center text-xs font-black text-slate-400">جارٍ تحميل خطة الأسبوع...</p> : null}
        </>}
      </section>}
      <PrintExportPopCard modal={print.modal} onClose={print.closeModal} onOpenFallback={(fallback) => void print.openFallbackPrintUrl(fallback)} />
      <ActivityPlanPreviewSetup open={previewSetupOpen} stage={previewStage} weekMode={previewWeekMode} weeks={previewWeeks} error={previewSetupError} onClose={() => setPreviewSetupOpen(false)} onStageChange={(stage) => { setPreviewStage(stage); setPreviewSetupError(""); }} onWeekModeChange={(mode) => { setPreviewWeekMode(mode); setPreviewSetupError(""); }} onWeeksChange={(weeks) => { setPreviewWeeks(weeks); setPreviewSetupError(""); }} onConfirm={openSelectedPreview} />
      {mode !== "ten-percent" ? <ActivityPlanCopyModal open={copyOpen} sourceStage={selectedStage} mode={mode} stages={stages} onClose={() => setCopyOpen(false)} /> : null}
      <CurriculumDistributionMobilePreview open={previewOpen} previewUrl={buildActivityPlanPreviewUrl(previewStage, mode, previewWeekMode, previewWeeks, false)} onDownload={printActivityPlan} onClose={() => setPreviewOpen(false)} title={mode === "ten-percent" ? "معاينة الخطة الفصلية (10%)" : "معاينة خطة النشاط الطلابي"} subtitle="راجع خطة النشاط قبل طباعتها أو تحميلها." documentSelector=".activity-plan-print-page" allowDocumentScroll />
      <ActivityPlanCellModal key={activeCell ? `${week}-${activeCell.dayOfWeek}-${activeCell.periodNumber}-${editing?.id || "new"}` : "closed"} week={week} cell={activeCell} entry={editing} stages={stages} selectedStage={selectedStage} gradesByStage={gradesByStage} grades={grades} teachers={teachers} onClose={() => { setActiveCell(null); setEditing(null); }} onSaved={(entry) => { setEntries((current) => [...current.filter((item) => !(item.stage === entry.stage && item.dayOfWeek === entry.dayOfWeek && item.periodNumber === entry.periodNumber)), entry]); setGrades((current) => Array.from(new Set([...current, entry.gradeLabel]))); setTeachers((current) => Array.from(new Set([...current, entry.teacherName]))); setActiveCell(null); setEditing(null); }} onDeleted={(id) => { setEntries((current) => current.filter((item) => item.id !== id)); setActiveCell(null); setEditing(null); }} />
      <PerformanceItemLinkPopCard open={linkOpen} serviceSlug="student-activity-plan" roleContext="ACTIVITY_LEADER" resourceType="ACTIVITY_PLAN" sourceReference={{ scope: "school-account" }} displayTitle="خطة النشاط الطلابي" targetType="portfolio-section" defaultTargetKey="student_activity" existingLink={existingLink} onClose={() => setLinkOpen(false)} onSaved={(link) => { setServiceLinks((current) => [...current.filter((item) => item.id !== link.id), link as ServiceLink]); }} />
    </main>
  );
}

function ActivityPlanControls({ stages, selectedStage, onStageChange, mode, onModeChange, onCopy }: { stages: string[]; selectedStage: string; onStageChange: (stage: string) => void; mode: "detailed" | "weekly" | "ten-percent"; onModeChange: (mode: "detailed" | "weekly" | "ten-percent") => void; onCopy: () => void }) {
  const selectedTabClass = mode === "detailed" ? "bg-white text-sky-700 shadow-sm" : mode === "weekly" ? "bg-white text-blue-700 shadow-sm" : "bg-white text-green-700 shadow-sm";
  return <div className="flex flex-col gap-2 md:flex-row md:items-center">
    <label className="flex min-h-10 items-center gap-2 text-xs font-black text-slate-600 dark:text-slate-300">المرحلة<select value={selectedStage} onChange={(event) => onStageChange(event.target.value)} className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-800 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 md:min-w-[155px]" aria-label="اختيار المرحلة">{stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select></label>
    <div className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950" role="tablist" aria-label="نمط خطة النشاط">
      <div className="flex min-w-max gap-1">
        <button type="button" role="tab" aria-selected={mode === "detailed"} onClick={() => onModeChange("detailed")} className={`min-h-8 flex-1 rounded-lg px-3 py-1.5 text-xs font-black transition ${mode === "detailed" ? selectedTabClass : "text-slate-500 hover:bg-white/70 hover:text-sky-700 dark:text-slate-400 dark:hover:bg-slate-900"}`}>الخطة الأسبوعية</button>
        <button type="button" role="tab" aria-selected={mode === "weekly"} onClick={() => onModeChange("weekly")} className={`min-h-8 flex-1 rounded-lg px-3 py-1.5 text-xs font-black transition ${mode === "weekly" ? selectedTabClass : "text-slate-500 hover:bg-white/70 hover:text-blue-700 dark:text-slate-400 dark:hover:bg-slate-900"}`}>الخطة الفصلية</button>
        <button type="button" role="tab" aria-selected={mode === "ten-percent"} onClick={() => onModeChange("ten-percent")} className={`min-h-8 flex-1 rounded-lg px-3 py-1.5 text-xs font-black transition ${mode === "ten-percent" ? selectedTabClass : "text-slate-500 hover:bg-white/70 hover:text-green-700 dark:text-slate-400 dark:hover:bg-slate-900"}`}>الخطة الفصلية (10%)</button>
      </div>
    </div>
    {mode !== "ten-percent" ? <button type="button" onClick={onCopy} disabled={!selectedStage} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-3 text-xs font-black text-sky-800 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200 dark:hover:bg-sky-950/50"><Copy className="h-4 w-4" />نسخ الخطة</button> : null}
  </div>;
}

function ActivityPlanCopyModal({ open, sourceStage, mode, stages, onClose }: { open: boolean; sourceStage: string; mode: "detailed" | "weekly"; stages: string[]; onClose: () => void }) {
  const [targets, setTargets] = useState<string[]>([]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [confirmRequired, setConfirmRequired] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTargets([]);
    setReplaceExisting(false);
    setConfirmRequired(false);
    setError("");
    setSuccess("");
  }, [open, sourceStage, mode]);

  function toggleTarget(stage: string) {
    setTargets((current) => current.includes(stage) ? current.filter((item) => item !== stage) : [...current, stage]);
    setConfirmRequired(false);
    setError("");
  }

  async function copyPlan() {
    if (!sourceStage || !targets.length) { setError("اختر مرحلة مستهدفة واحدة على الأقل."); return; }
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/dashboard/activity-plan/copy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceStage, targetStages: targets, mode, replaceExisting }) });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 409 && payload.requiresConfirmation) {
        setConfirmRequired(true);
        setReplaceExisting(true);
        setError(payload.error || "توجد بيانات حالية في المرحلة المستهدفة.");
        return;
      }
      if (!response.ok) throw new Error(payload.error || "تعذر نسخ الخطة.");
      const count = Array.isArray(payload.copiedStages) ? payload.copiedStages.length : targets.length;
      setSuccess(count === 1 ? "تم نسخ الخطة إلى المرحلة المحددة بنجاح." : `تم نسخ الخطة إلى ${count} مراحل محددة بنجاح.`);
      setConfirmRequired(false);
      setReplaceExisting(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر نسخ الخطة."); }
    finally { setSaving(false); }
  }

  const availableStages = stages.filter((stage) => stage !== sourceStage);
  return <SmartActionModal open={open} title="نسخ الخطة" description={mode === "weekly" ? "الخطة الفصلية" : "الخطة الأسبوعية"} portal onClose={onClose} showFooter={false}><div className="space-y-4" dir="rtl"><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs font-black text-slate-500">نسخ من</p><p className="mt-1 text-sm font-black text-slate-900">{sourceStage || "—"}</p></div><div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs font-black text-slate-500">نوع الخطة</p><p className="mt-1 text-sm font-black text-slate-900">{mode === "weekly" ? "الخطة الفصلية" : "الخطة الأسبوعية"}</p></div></div><fieldset><legend className="mb-2 text-sm font-black text-slate-700">نسخ إلى</legend><div className="grid gap-2 sm:grid-cols-2">{availableStages.map((stage) => <label key={stage} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700 hover:bg-sky-50"><input type="checkbox" checked={targets.includes(stage)} onChange={() => toggleTarget(stage)} />{stage}</label>)}</div></fieldset>{confirmRequired ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-black leading-7 text-amber-800">توجد بيانات حالية في المرحلة المستهدفة. هل تريد استبدالها بالخطة المنسوخة؟</div> : null}{error ? <p className="rounded-xl bg-rose-50 p-3 text-xs font-black text-rose-700">{error}</p> : null}{success ? <p className="rounded-xl bg-emerald-50 p-3 text-xs font-black text-emerald-700">{success}</p> : null}<div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => void copyPlan()} disabled={saving || !targets.length} className="h-11 rounded-xl bg-sky-700 text-sm font-black text-white disabled:opacity-50">{saving ? "جار النسخ..." : confirmRequired ? "تأكيد النسخ والاستبدال" : "نسخ الخطة"}</button><button type="button" onClick={onClose} disabled={saving} className="h-11 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-600">إلغاء</button></div></div></SmartActionModal>;
}

function ActivityPlanCellModal({ week, cell, entry, stages, selectedStage, gradesByStage, grades, teachers, onClose, onSaved, onDeleted }: { week: number; cell: Cell | null; entry: Entry | null; stages: string[]; selectedStage: string; gradesByStage: Record<string, string[]>; grades: string[]; teachers: string[]; onClose: () => void; onSaved: (entry: Entry) => void; onDeleted: (id: string) => void }) {
  const [domainServiceSlug, setDomainServiceSlug] = useState(entry?.domainServiceSlug || "");
  const [programValue, setProgramValue] = useState(entry?.program.key || "");
  const [manualProgramName, setManualProgramName] = useState("");
  const [programOptions, setProgramOptions] = useState<WorkflowProgramOption[]>([]);
  const [programLoading, setProgramLoading] = useState(false);
  const [stage, setStage] = useState(entry?.stage || selectedStage);
  const [gradeLabel, setGradeLabel] = useState(entry?.gradeLabel || "");
  const [teacherName, setTeacherName] = useState(entry?.teacherName || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!domainServiceSlug) {
      setProgramOptions([]);
      setProgramValue("");
      setManualProgramName("");
      return;
    }
    let cancelled = false;
    setProgramLoading(true);
    void fetch(`/api/dashboard/activity-plan/program-options?serviceSlug=${encodeURIComponent(domainServiceSlug)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "تعذر تحميل برامج المجال.");
        if (cancelled) return;
        const options = (payload.options || []) as WorkflowProgramOption[];
        setProgramOptions(options);
        const savedValue = entry?.program.key || entry?.program.title || "";
        const saved = options.find((option) => option.value === savedValue || option.label === savedValue);
        if (saved) {
          setProgramValue(saved.value);
          setManualProgramName(saved.isOther ? entry?.program.title || "" : "");
        } else if (entry?.program.title) {
          setProgramValue(ACTIVITY_PLAN_OTHER_PROGRAM_VALUE);
          setManualProgramName(entry.program.title);
        } else {
          setProgramValue("");
          setManualProgramName("");
        }
      })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "تعذر تحميل برامج المجال."); })
      .finally(() => { if (!cancelled) setProgramLoading(false); });
    return () => { cancelled = true; };
  }, [domainServiceSlug, entry]);
  if (!cell) return null;

  const save = async () => {
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/dashboard/activity-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: entry?.id, weekNumber: week, dayOfWeek: cell.dayOfWeek, periodNumber: cell.periodNumber, domainServiceSlug, programValue, programName: manualProgramName, stage, gradeLabel, teacherName }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "تعذر حفظ الإدخال.");
      onSaved(payload.entry);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر حفظ الإدخال."); } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!entry) return;
    setDeleting(true); setError("");
    try {
      const response = await fetch("/api/dashboard/activity-plan", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: entry.id }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "تعذر حذف الإدخال.");
      onDeleted(entry.id);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر حذف الإدخال."); } finally { setDeleting(false); }
  };

  return <SmartActionModal open title={entry ? "تعديل نشاط الخلية" : "إضافة نشاط للخلية"} description={`${formatDate(cell.date)} · الحصة ${cell.periodNumber}`} portal onClose={onClose} showFooter={false}>
    <div className="space-y-4">
      <label className="block text-sm font-black text-slate-700">مجال النشاط<select required value={domainServiceSlug} onChange={(event) => { setDomainServiceSlug(event.target.value); setProgramValue(""); setManualProgramName(""); setError(""); }} className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-right text-sm font-bold outline-none focus:border-sky-500"><option value="">اختر مجال النشاط</option>{ACTIVITY_PROGRAM_DOMAINS.map((domain) => <option key={domain.serviceSlug} value={domain.serviceSlug}>{domain.title}</option>)}</select></label>
      <label className="block text-sm font-black text-slate-700">البرنامج<select required value={programValue} disabled={!domainServiceSlug || programLoading} onChange={(event) => { const value = event.target.value; setProgramValue(value); if (value !== ACTIVITY_PLAN_OTHER_PROGRAM_VALUE) setManualProgramName(""); }} className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-right text-sm font-bold outline-none focus:border-sky-500"><option value="">{programLoading ? "جارٍ تحميل البرامج..." : "اختر البرنامج"}</option>{programOptions.map((program) => <option key={program.value} value={program.value}>{program.label}</option>)}</select></label>
      {programValue === ACTIVITY_PLAN_OTHER_PROGRAM_VALUE ? <SuggestionInput label="اسم البرنامج" value={manualProgramName} onChange={setManualProgramName} suggestions={[]} placeholder="اكتب اسم البرنامج" /> : null}
      <label className="block text-sm font-black text-slate-700">المرحلة<select required value={stage} onChange={(event) => { const nextStage = event.target.value; setStage(nextStage); if (gradeLabel && !(gradesByStage[nextStage] || []).includes(gradeLabel)) setGradeLabel(""); }} className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-right text-sm font-bold outline-none focus:border-sky-500"><option value="">اختر المرحلة</option>{stages.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <SuggestionInput label="الصف" value={gradeLabel} onChange={setGradeLabel} suggestions={gradesByStage[stage] || grades} placeholder="مثال: الثالث متوسط" />
      <SuggestionInput label="اسم المعلم" value={teacherName} onChange={setTeacherName} suggestions={teachers} placeholder="اكتب اسم المعلم" />
      {error ? <p className="rounded-xl bg-rose-50 p-3 text-xs font-black text-rose-700">{error}</p> : null}
      <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => void save()} disabled={saving || !programValue || (programValue === ACTIVITY_PLAN_OTHER_PROGRAM_VALUE && !manualProgramName.trim()) || !gradeLabel.trim() || !teacherName.trim()} className="h-12 rounded-2xl bg-sky-700 text-sm font-black text-white disabled:opacity-50">{saving ? "جارٍ الحفظ..." : "حفظ الخلية"}</button><button type="button" onClick={onClose} disabled={saving || deleting} className="h-12 rounded-2xl border border-slate-200 text-sm font-black text-slate-600">إلغاء</button></div>
      {entry ? <button type="button" onClick={() => setConfirmDelete(true)} disabled={saving || deleting} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-rose-50 text-sm font-black text-rose-700 ring-1 ring-rose-100"><Trash2 className="h-4 w-4" />حذف الإدخال</button> : null}
    </div>
    <SmartActionModal open={confirmDelete} title="تأكيد حذف الإدخال" description="سيتم إزالة النشاط من هذه الخلية فقط." variant="danger" confirmLabel="حذف الإدخال" loading={deleting} portal onClose={() => setConfirmDelete(false)} onConfirm={() => void remove()} />
  </SmartActionModal>;
}

function buildActivityPlanPreviewUrl(stage: string, mode: "detailed" | "weekly" | "ten-percent", weekMode: "all" | "selected" | "semester", weeks: number[], print: boolean) {
  const params = new URLSearchParams({ preview: "1", stage, mode });
  if (print) params.set("print", "1");
  if (weekMode === "selected" && weeks.length) params.set("weeks", weeks.join(","));
  return `/print/activity-plan?${params.toString()}`;
}

function ActivityPlanPreviewSetup({ open, stage, weekMode, weeks, error, onClose, onStageChange, onWeekModeChange, onWeeksChange, onConfirm }: { open: boolean; stage: string; weekMode: "all" | "selected" | "semester"; weeks: number[]; error: string; onClose: () => void; onStageChange: (stage: string) => void; onWeekModeChange: (mode: "all" | "selected") => void; onWeeksChange: (weeks: number[]) => void; onConfirm: () => void }) {
  const toggleWeek = (week: number) => onWeeksChange(weeks.includes(week) ? weeks.filter((item) => item !== week) : [...weeks, week].sort((a, b) => a - b));
  const semesterMode = weekMode === "semester";

  return <SmartActionModal open={open} title="إعداد معاينة خطة النشاط" description={semesterMode ? "اختر المرحلة قبل فتح المعاينة." : "اختر المرحلة ونطاق الأسابيع قبل فتح المعاينة."} portal onClose={onClose} showFooter={false}>
    <div className="space-y-4">
      <label className="block text-sm font-black text-slate-700">المرحلة<select required value={stage} onChange={(event) => onStageChange(event.target.value)} className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-right text-sm font-bold outline-none focus:border-sky-500"><option value="">اختر المرحلة</option>{REAL_ACTIVITY_PLAN_STAGES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
       {!semesterMode ? <fieldset className="space-y-2"><legend className="text-sm font-black text-slate-700">نطاق الأسابيع</legend><label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700"><input type="radio" name="activity-plan-week-mode" checked={weekMode === "all"} onChange={() => onWeekModeChange("all")} />كل الأسابيع</label><label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700"><input type="radio" name="activity-plan-week-mode" checked={weekMode === "selected"} onChange={() => onWeekModeChange("selected")} />تحديد أسابيع</label></fieldset> : null}
       {!semesterMode && weekMode === "selected" ? <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="mb-2 flex items-center justify-between gap-2"><span className="text-xs font-black text-slate-500">اختر أسبوعًا أو أكثر</span><span className="flex gap-2"><button type="button" onClick={() => onWeeksChange(Array.from({ length: 20 }, (_, index) => index + 1))} className="text-[11px] font-black text-sky-700 hover:text-sky-900">تحديد الكل</button><button type="button" onClick={() => onWeeksChange([])} className="text-[11px] font-black text-slate-500 hover:text-slate-700">إلغاء التحديد</button></span></div><div className="max-h-56 space-y-1 overflow-y-auto overscroll-contain pl-1" role="group" aria-label="اختيار الأسابيع">{Array.from({ length: 20 }, (_, index) => index + 1).map((week) => <label key={week} className="flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-100 hover:bg-sky-50"><input type="checkbox" checked={weeks.includes(week)} onChange={() => toggleWeek(week)} />الأسبوع {week}</label>)}</div></div> : null}
      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-700" role="alert">{error}</p> : null}
      <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={onConfirm} disabled={!REAL_ACTIVITY_PLAN_STAGES.includes(stage) || (weekMode === "selected" && weeks.length === 0)} className="h-11 rounded-2xl bg-sky-700 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50">فتح المعاينة</button><button type="button" onClick={onClose} className="h-11 rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-600 transition hover:bg-slate-50">إلغاء</button></div>
    </div>
  </SmartActionModal>;
}

function SuggestionInput({ label, value, onChange, suggestions, placeholder }: { label: string; value: string; onChange: (value: string) => void; suggestions: string[]; placeholder: string }) {
  const visible = suggestions.filter((item) => item.includes(value.trim())).slice(0, 6);
  return <div><label className="mb-2 block text-sm font-black text-slate-700">{label}</label><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-right text-sm font-bold outline-none focus:border-sky-500" />{value.trim() && visible.length ? <div className="mt-2 flex flex-wrap gap-2">{visible.map((item) => <button type="button" key={item} onClick={() => onChange(item)} className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">{item}</button>)}</div> : null}</div>;
}
