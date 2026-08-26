"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Eye, Link2, Plus, Trash2 } from "lucide-react";
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
import { ServiceOutputLinkActions } from "@/components/performance-links/service-output-link-actions";

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
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}` : value;
}

export function ActivityPlanShell() {
  const [week, setWeek] = useState(1);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [dates, setDates] = useState<DateItem[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [gradesByStage, setGradesByStage] = useState<Record<string, string[]>>({});
  const [stages, setStages] = useState<string[]>([]);
  const [selectedStage, setSelectedStage] = useState("");
  const [teachers, setTeachers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCell, setActiveCell] = useState<Cell | null>(null);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSetupOpen, setPreviewSetupOpen] = useState(false);
  const [previewStage, setPreviewStage] = useState("");
  const [previewWeekMode, setPreviewWeekMode] = useState<"all" | "selected">("all");
  const [previewWeeks, setPreviewWeeks] = useState<number[]>([]);
  const [previewSetupError, setPreviewSetupError] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
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
  }, []);

  const existingLink = serviceLinks.find((link) => link.sourceKey === "school-account") || null;

  const entryByCell = useMemo(
    () => new Map(entries.map((entry) => [`${entry.dayOfWeek}-${entry.periodNumber}`, entry])),
    [entries],
  );
  const currentDate = dates[0]?.date && dates[dates.length - 1]?.date
    ? `${formatDate(dates[0].date)} — ${formatDate(dates[dates.length - 1].date)}`
    : "";

  async function printActivityPlan() {
    const result = await print.runPrintExport({
      exportUrl: "/api/dashboard/activity-plan/export/pdf",
      method: "POST",
      body: { fileName: "student-activity-plan.pdf", stage: previewStage, weeks: previewWeekMode === "selected" ? previewWeeks : undefined },
      printUrl: buildActivityPlanPreviewUrl(previewStage, previewWeekMode, previewWeeks, true),
      fileName: "student-activity-plan.pdf",
      blockedTitle: "معاينة خطة النشاط الطلابي",
      blockedMessage: "تم حظر فتح نافذة المعاينة تلقائياً. استخدم الزر أدناه لفتح مستند الطباعة.",
    });
    return result !== "error";
  }

  function openPreviewSetup() {
    setPreviewStage(selectedStage);
    setPreviewWeekMode("all");
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
    <main className="space-y-6" dir="rtl">
      <section className="overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-sky-900 via-sky-800 to-cyan-700 p-6 text-white shadow-xl md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <span className="text-sm font-black text-cyan-200">رائد النشاط</span>
            <h1 className="mt-2 text-3xl font-black md:text-4xl">خطة النشاط الطلابي</h1>
            <p className="mt-3 text-sm font-bold leading-7 text-sky-100">نظّم برامج النشاط في شبكة أسبوعية واضحة.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-3xl bg-white/10 px-5 py-4 text-center ring-1 ring-white/15">
              <p className="text-xs font-bold text-cyan-100">الأسبوع الحالي</p>
              <strong className="mt-1 block text-2xl font-black">الأسبوع {week} من 20</strong>
              {currentDate ? <span className="mt-1 block text-xs font-bold text-sky-100">{currentDate}</span> : null}
            </div>
            {existingLink ? <ServiceOutputLinkActions link={existingLink} onDeleted={() => setServiceLinks((current) => current.filter((item) => item.id !== existingLink.id))} /> : null}
            <button type="button" onClick={() => setLinkOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/20"><Link2 className="h-4 w-4" />{existingLink ? "تعديل الربط" : "ربط بملف الإنجاز"}</button>
            <button type="button" onClick={openPreviewSetup} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-sky-900 shadow-lg shadow-sky-950/20 transition hover:bg-cyan-50"><Eye className="h-4 w-4" />معاينة</button>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex justify-center">
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1" aria-label="اختيار الأسبوع">
            {Array.from({ length: 20 }, (_, index) => index + 1).map((item) => (
              <button type="button" key={item} onClick={() => setWeek(item)} className={item === week ? "h-10 min-w-10 rounded-2xl bg-sky-700 px-3 text-sm font-black text-white shadow-lg shadow-sky-100" : "h-10 min-w-10 rounded-2xl bg-slate-50 px-3 text-sm font-black text-slate-600 ring-1 ring-slate-200 hover:bg-sky-50"}>{item}</button>
            ))}
          </div>
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700">{error}</div> : null}
      <section className="rounded-[2rem] border border-slate-200 bg-white p-3 shadow-sm md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><h2 className="text-xl font-black text-slate-950">الجدول الأسبوعي</h2><p className="mt-1 text-xs font-bold text-slate-500">الأيام صفوف والحصص أعمدة. اضغط للإضافة أو التعديل.</p></div>
          <label className="flex shrink-0 items-center gap-2 text-xs font-black text-slate-600">المرحلة<select value={selectedStage} onChange={(event) => setSelectedStage(event.target.value)} className="h-10 min-w-[170px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-800 outline-none focus:border-sky-500" aria-label="اختيار المرحلة">{stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select></label>
          <CalendarDays className="h-6 w-6 text-sky-600" />
        </div>
        <div className="overflow-x-auto overscroll-x-contain rounded-2xl border border-slate-200 [scrollbar-width:thin]" style={{ WebkitOverflowScrolling: "touch" }}>
          <div className="min-w-[1220px]">
            <div className="grid grid-cols-[140px_repeat(7,minmax(154px,1fr))] bg-slate-50" dir="rtl">
              <div className="border-b border-l border-slate-200 p-4 text-sm font-black text-slate-500">اليوم / الحصص</div>
              {ACTIVITY_PLAN_PERIODS.map((period) => <div key={period} className="border-b border-l border-slate-200 p-4 text-center text-sm font-black text-slate-700">{getPeriodLabel(period)}</div>)}
            </div>
            {dates.map((day) => (
              <div key={day.dayOfWeek} className="grid grid-cols-[140px_repeat(7,minmax(154px,1fr))]" dir="rtl">
                <div className="flex min-h-[148px] flex-col justify-center border-b border-l border-slate-200 bg-slate-50 p-3 text-center">
                  <span className="text-sm font-black text-slate-900">{day.label}</span><span className="mt-1 text-xs font-bold text-sky-700">{formatDate(day.date)}</span>
                </div>
                {ACTIVITY_PLAN_PERIODS.map((period) => {
                  const entry = entryByCell.get(`${day.dayOfWeek}-${period}`);
                  const domainProgram = entry?.domainKey ? getActivityPlanProgramByKey(entry.domainKey) : null;
                  const colorClass = domainProgram?.colorClass || "";
                  return <button type="button" key={`${day.dayOfWeek}-${period}`} onClick={() => { setActiveCell({ dayOfWeek: day.dayOfWeek, periodNumber: period, date: day.date }); setEditing(entry || null); }} className="group min-h-[148px] border-b border-l border-slate-200 bg-white p-3 text-right transition hover:bg-sky-50/50">
                    {entry ? <div className={`h-full rounded-2xl border p-3 ${colorClass || "border-slate-200 bg-slate-50 text-slate-950"}`}><p className="break-words whitespace-normal text-[13px] font-black leading-5 text-center">{entry.displayTitle || entry.program.title}</p><p className="mt-2 text-xs font-bold text-slate-700">{entry.gradeLabel}</p><p className="mt-1 text-xs font-bold text-slate-600">{entry.teacherName}</p><span className="mt-3 block text-[10px] font-black text-sky-700 opacity-0 transition group-hover:opacity-100">اضغط للتعديل</span></div> : <span className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 text-slate-400 transition group-hover:border-sky-300 group-hover:bg-sky-50 group-hover:text-sky-700"><Plus className="h-6 w-6" /><span className="text-xs font-black">إضافة</span></span>}
                  </button>;
                })}
              </div>
            ))}
          </div>
        </div>
        {loading ? <p className="py-4 text-center text-xs font-black text-slate-400">جارٍ تحميل خطة الأسبوع...</p> : null}
      </section>

      <PrintExportPopCard modal={print.modal} onClose={print.closeModal} onOpenFallback={(fallback) => void print.openFallbackPrintUrl(fallback)} />
      <ActivityPlanPreviewSetup open={previewSetupOpen} stage={previewStage} weekMode={previewWeekMode} weeks={previewWeeks} error={previewSetupError} onClose={() => setPreviewSetupOpen(false)} onStageChange={(stage) => { setPreviewStage(stage); setPreviewSetupError(""); }} onWeekModeChange={(mode) => { setPreviewWeekMode(mode); setPreviewSetupError(""); }} onWeeksChange={(weeks) => { setPreviewWeeks(weeks); setPreviewSetupError(""); }} onConfirm={openSelectedPreview} />
      <CurriculumDistributionMobilePreview open={previewOpen} previewUrl={buildActivityPlanPreviewUrl(previewStage, previewWeekMode, previewWeeks, false)} onDownload={printActivityPlan} onClose={() => setPreviewOpen(false)} title="معاينة خطة النشاط الطلابي" subtitle="راجع خطة النشاط قبل طباعتها أو تحميلها." documentSelector=".activity-plan-print-page" allowDocumentScroll />
      <ActivityPlanCellModal key={activeCell ? `${week}-${activeCell.dayOfWeek}-${activeCell.periodNumber}-${editing?.id || "new"}` : "closed"} week={week} cell={activeCell} entry={editing} stages={stages} selectedStage={selectedStage} gradesByStage={gradesByStage} grades={grades} teachers={teachers} onClose={() => { setActiveCell(null); setEditing(null); }} onSaved={(entry) => { setEntries((current) => [...current.filter((item) => !(item.stage === entry.stage && item.dayOfWeek === entry.dayOfWeek && item.periodNumber === entry.periodNumber)), entry]); setGrades((current) => Array.from(new Set([...current, entry.gradeLabel]))); setTeachers((current) => Array.from(new Set([...current, entry.teacherName]))); setActiveCell(null); setEditing(null); }} onDeleted={(id) => { setEntries((current) => current.filter((item) => item.id !== id)); setActiveCell(null); setEditing(null); }} />
      <PerformanceItemLinkPopCard open={linkOpen} serviceSlug="student-activity-plan" roleContext="ACTIVITY_LEADER" resourceType="ACTIVITY_PLAN" sourceReference={{ scope: "school-account" }} displayTitle="خطة النشاط الطلابي" targetType="portfolio-section" defaultTargetKey="student_activity" existingLink={existingLink} onClose={() => setLinkOpen(false)} onSaved={(link) => { setServiceLinks((current) => [...current.filter((item) => item.id !== link.id), link as ServiceLink]); }} />
    </main>
  );
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

function buildActivityPlanPreviewUrl(stage: string, weekMode: "all" | "selected", weeks: number[], print: boolean) {
  const params = new URLSearchParams({ preview: "1", stage });
  if (print) params.set("print", "1");
  if (weekMode === "selected" && weeks.length) params.set("weeks", weeks.join(","));
  return `/print/activity-plan?${params.toString()}`;
}

function ActivityPlanPreviewSetup({ open, stage, weekMode, weeks, error, onClose, onStageChange, onWeekModeChange, onWeeksChange, onConfirm }: { open: boolean; stage: string; weekMode: "all" | "selected"; weeks: number[]; error: string; onClose: () => void; onStageChange: (stage: string) => void; onWeekModeChange: (mode: "all" | "selected") => void; onWeeksChange: (weeks: number[]) => void; onConfirm: () => void }) {
  const toggleWeek = (week: number) => onWeeksChange(weeks.includes(week) ? weeks.filter((item) => item !== week) : [...weeks, week].sort((a, b) => a - b));

  return <SmartActionModal open={open} title="إعداد معاينة خطة النشاط" description="اختر المرحلة ونطاق الأسابيع قبل فتح المعاينة." portal onClose={onClose} showFooter={false}>
    <div className="space-y-4">
      <label className="block text-sm font-black text-slate-700">المرحلة<select required value={stage} onChange={(event) => onStageChange(event.target.value)} className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-right text-sm font-bold outline-none focus:border-sky-500"><option value="">اختر المرحلة</option>{REAL_ACTIVITY_PLAN_STAGES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <fieldset className="space-y-2"><legend className="text-sm font-black text-slate-700">نطاق الأسابيع</legend><label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700"><input type="radio" name="activity-plan-week-mode" checked={weekMode === "all"} onChange={() => onWeekModeChange("all")} />كل الأسابيع</label><label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700"><input type="radio" name="activity-plan-week-mode" checked={weekMode === "selected"} onChange={() => onWeekModeChange("selected")} />تحديد أسابيع</label></fieldset>
      {weekMode === "selected" ? <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="mb-2 flex items-center justify-between gap-2"><span className="text-xs font-black text-slate-500">اختر أسبوعًا أو أكثر</span><span className="flex gap-2"><button type="button" onClick={() => onWeeksChange(Array.from({ length: 20 }, (_, index) => index + 1))} className="text-[11px] font-black text-sky-700 hover:text-sky-900">تحديد الكل</button><button type="button" onClick={() => onWeeksChange([])} className="text-[11px] font-black text-slate-500 hover:text-slate-700">إلغاء التحديد</button></span></div><div className="max-h-56 space-y-1 overflow-y-auto overscroll-contain pl-1" role="group" aria-label="اختيار الأسابيع">{Array.from({ length: 20 }, (_, index) => index + 1).map((week) => <label key={week} className="flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-100 hover:bg-sky-50"><input type="checkbox" checked={weeks.includes(week)} onChange={() => toggleWeek(week)} />الأسبوع {week}</label>)}</div></div> : null}
      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-700" role="alert">{error}</p> : null}
      <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={onConfirm} disabled={!REAL_ACTIVITY_PLAN_STAGES.includes(stage) || (weekMode === "selected" && weeks.length === 0)} className="h-11 rounded-2xl bg-sky-700 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50">فتح المعاينة</button><button type="button" onClick={onClose} className="h-11 rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-600 transition hover:bg-slate-50">إلغاء</button></div>
    </div>
  </SmartActionModal>;
}

function SuggestionInput({ label, value, onChange, suggestions, placeholder }: { label: string; value: string; onChange: (value: string) => void; suggestions: string[]; placeholder: string }) {
  const visible = suggestions.filter((item) => item.includes(value.trim())).slice(0, 6);
  return <div><label className="mb-2 block text-sm font-black text-slate-700">{label}</label><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-right text-sm font-bold outline-none focus:border-sky-500" />{value.trim() && visible.length ? <div className="mt-2 flex flex-wrap gap-2">{visible.map((item) => <button type="button" key={item} onClick={() => onChange(item)} className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">{item}</button>)}</div> : null}</div>;
}
