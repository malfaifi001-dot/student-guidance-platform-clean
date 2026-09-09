"use client";

import { useEffect, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { SmartActionModal } from "@/components/ui/smart-action-modal";
import { ACTIVITY_PROGRAM_DOMAINS } from "@/lib/activity-programs/activity-program-catalog";
import { ACTIVITY_PLAN_OTHER_PROGRAM_VALUE } from "@/lib/activity-plan/activity-plan-program-value";
import { ACTIVITY_PLAN_SECTIONS, getActivityPlanGradeOptions } from "@/lib/activity-plan/activity-plan-stages";
import { formatActivityPlanHijriDate } from "@/lib/activity-plan/activity-plan-date-format";

type Program = { id: string; key?: string; title: string };
export type WeeklyActivityPlanEntry = {
  id: string;
  stage: string;
  dayOfWeek: number;
  periodNumber: number;
  date: string;
  gradeLabel: string;
  section?: string;
  subject?: string;
  materialType?: "أساسية" | "10%";
  teacherName: string;
  domainServiceSlug?: string;
  domainKey?: string;
  displayTitle?: string;
  program: Program;
};

type WorkflowProgramOption = { value: string; label: string; isOther: boolean };
type SelectedProgram = WorkflowProgramOption & { domainServiceSlug: string };
type Cell = { dayOfWeek: number; periodNumber: number; date: string };
type JsonPayload = Record<string, unknown>;

async function readJsonResponse(response: Response): Promise<JsonPayload> {
  const body = await response.text();
  if (!body.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(body);
    return parsed && typeof parsed === "object" ? parsed as JsonPayload : {};
  } catch {
    return {};
  }
}

function getResponseError(payload: JsonPayload, fallback: string, status: number) {
  return typeof payload.error === "string" && payload.error.trim()
    ? payload.error
    : `${fallback} (${status}).`;
}

function gradeOptions(stage: string, gradesByStage: Record<string, string[]>) {
  const catalogGrades = getActivityPlanGradeOptions(stage);
  return catalogGrades.length ? catalogGrades : gradesByStage[stage] || [];
}

function formatDate(value: string) {
  return formatActivityPlanHijriDate(value);
}

export function WeeklyActivityPlanCellModal({ week, cell, entry, stages, selectedStage, gradesByStage, teachers, onClose, onSaved, onDeleted }: {
  week: number;
  cell: Cell | null;
  entry: WeeklyActivityPlanEntry | null;
  stages: string[];
  selectedStage: string;
  gradesByStage: Record<string, string[]>;
  teachers: string[];
  onClose: () => void;
  onSaved: (entries: WeeklyActivityPlanEntry[]) => void;
  onDeleted: (id: string) => void;
}) {
  const [stage, setStage] = useState(entry?.stage || selectedStage);
  const [gradeLabel, setGradeLabel] = useState(entry?.gradeLabel || "");
  const [section, setSection] = useState(entry?.section || "");
  const [selectedDomains, setSelectedDomains] = useState<string[]>(entry?.domainServiceSlug ? [entry.domainServiceSlug] : []);
  const [selectedPrograms, setSelectedPrograms] = useState<SelectedProgram[]>([]);
  const [programOptionsByDomain, setProgramOptionsByDomain] = useState<Record<string, WorkflowProgramOption[]>>({});
  const [manualProgramName, setManualProgramName] = useState("");
  const [subject, setSubject] = useState(entry?.subject || "");
  const [materialType, setMaterialType] = useState<"أساسية" | "10%">(entry?.materialType || "أساسية");
  const [teacherName, setTeacherName] = useState(entry?.teacherName || "");
  const [programLoading, setProgramLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const selectedDomainKey = selectedDomains.join("|");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!selectedDomains.length) {
      setProgramOptionsByDomain({});
      setSelectedPrograms([]);
      return;
    }
    let cancelled = false;
    setProgramLoading(true);
    setError("");
    void Promise.all(selectedDomains.map(async (domain) => {
      const response = await fetch(`/api/dashboard/activity-plan/program-options?serviceSlug=${encodeURIComponent(domain)}`, { cache: "no-store" });
      const payload = await readJsonResponse(response);
      if (!response.ok) throw new Error(getResponseError(payload, "تعذر تحميل برامج المجال", response.status));
      return [domain, (payload.options || []) as WorkflowProgramOption[]] as const;
    }))
      .then((results) => {
        if (cancelled) return;
        const nextOptions = Object.fromEntries(results);
        setProgramOptionsByDomain(nextOptions);
        if (entry) {
          const savedDomain = entry.domainServiceSlug || "";
          const savedValue = entry.program.key || entry.program.title || "";
          const savedOption = (nextOptions[savedDomain] || []).find((option) => option.value === savedValue || option.label === savedValue);
          if (savedOption) {
            setSelectedPrograms([{ ...savedOption, domainServiceSlug: savedDomain }]);
            setManualProgramName(savedOption.isOther ? entry.program.title || "" : "");
          } else if (entry.program.title) {
            setSelectedPrograms([{ value: ACTIVITY_PLAN_OTHER_PROGRAM_VALUE, label: "أخرى", isOther: true, domainServiceSlug: savedDomain }]);
            setManualProgramName(entry.program.title);
          }
        } else {
          setSelectedPrograms((current) => current.filter((program) => nextOptions[program.domainServiceSlug]?.some((option) => option.value === program.value)));
        }
      })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "تعذر تحميل برامج المجال."); })
      .finally(() => { if (!cancelled) setProgramLoading(false); });
    return () => { cancelled = true; };
  }, [selectedDomainKey, selectedDomains, entry]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!cell) return null;
  const activeCell = cell;

  const availableGrades = gradeOptions(stage, gradesByStage);
  const availablePrograms = selectedDomains.flatMap((domain) => (programOptionsByDomain[domain] || []).map((program) => ({ ...program, domainServiceSlug: domain })));
  const hasOtherProgram = selectedPrograms.some((program) => program.isOther);

  function toggleDomain(domain: string) {
    setSelectedDomains((current) => {
      const next = current.includes(domain) ? current.filter((item) => item !== domain) : [...current, domain];
      setSelectedPrograms((programs) => programs.filter((program) => next.includes(program.domainServiceSlug)));
      return next;
    });
  }

  function toggleProgram(program: SelectedProgram) {
    setSelectedPrograms((current) => {
      if (entry) return current.some((item) => item.domainServiceSlug === program.domainServiceSlug && item.value === program.value) ? [] : [program];
      const exists = current.some((item) => item.domainServiceSlug === program.domainServiceSlug && item.value === program.value);
      return exists ? current.filter((item) => !(item.domainServiceSlug === program.domainServiceSlug && item.value === program.value)) : [...current, program];
    });
    if (!program.isOther) setManualProgramName("");
  }

  async function save() {
    if (!selectedPrograms.length || (hasOtherProgram && !manualProgramName.trim()) || !teacherName.trim()) {
      setError("اختر برنامجًا واحدًا على الأقل وأكمل بيانات الخلية المطلوبة.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/activity-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: entry?.id,
          weekNumber: week,
          dayOfWeek: activeCell.dayOfWeek,
          periodNumber: activeCell.periodNumber,
          programs: selectedPrograms.map((program) => ({ domainServiceSlug: program.domainServiceSlug, programValue: program.value, programName: program.isOther ? manualProgramName : "" })),
          stage,
          gradeLabel,
          section,
          subject,
          materialType,
          teacherName,
        }),
      });
      const payload = await readJsonResponse(response);
      if (!response.ok) throw new Error(getResponseError(payload, "تعذر حفظ الخلية", response.status));
      const savedEntries = Array.isArray(payload.entries) ? payload.entries as WeeklyActivityPlanEntry[] : payload.entry ? [payload.entry as WeeklyActivityPlanEntry] : [];
      if (!savedEntries.length) throw new Error("تعذر قراءة النشاط المحفوظ.");
      onSaved(savedEntries);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حفظ الخلية.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!entry) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/activity-plan", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: entry.id }) });
      const payload = await readJsonResponse(response);
      if (!response.ok) throw new Error(getResponseError(payload, "تعذر حذف الإدخال", response.status));
      onDeleted(entry.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حذف الإدخال.");
    } finally {
      setDeleting(false);
    }
  }

  return <SmartActionModal open title={entry ? "تعديل نشاط الخلية" : "إضافة أنشطة للخلية"} description={`${formatDate(activeCell.date)} · الحصة ${activeCell.periodNumber}`} portal onClose={onClose} showFooter={false}>
    <div className="space-y-3" dir="rtl">
      <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/60">
        <legend className="px-1 text-xs font-black text-slate-500">الوجهة</legend>
        <div className="mt-1 grid gap-3 sm:grid-cols-3">
          <label className="block text-sm font-black text-slate-700 dark:text-slate-200">المرحلة<select required value={stage} onChange={(event) => { const nextStage = event.target.value; const nextGrades = gradeOptions(nextStage, gradesByStage); setStage(nextStage); if (gradeLabel && !nextGrades.includes(gradeLabel)) setGradeLabel(""); }} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-sm font-bold outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950"><option value="">اختر المرحلة</option>{stages.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="block text-sm font-black text-slate-700 dark:text-slate-200">الصف (اختياري)<select value={gradeLabel} onChange={(event) => setGradeLabel(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-sm font-bold dark:border-slate-700 dark:bg-slate-950"><option value="">بدون صف</option>{availableGrades.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="block text-sm font-black text-slate-700 dark:text-slate-200">الفصل (اختياري)<select value={section} onChange={(event) => setSection(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-sm font-bold dark:border-slate-700 dark:bg-slate-950"><option value="">بدون فصل</option>{ACTIVITY_PLAN_SECTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/60">
        <legend className="px-1 text-xs font-black text-slate-500">النشاط</legend>
        <p className="mb-2 text-xs font-black text-slate-600 dark:text-slate-300">مجالات النشاط</p>
        <div className="flex flex-wrap gap-2">{ACTIVITY_PROGRAM_DOMAINS.map((domain) => { const selected = selectedDomains.includes(domain.serviceSlug); return <button type="button" key={domain.serviceSlug} aria-pressed={selected} onClick={() => toggleDomain(domain.serviceSlug)} className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-black transition ${selected ? "border-sky-700 bg-sky-700 text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"}`}>{selected ? <Check className="h-3.5 w-3.5" /> : null}{domain.title}</button>; })}</div>
        <p className="mb-2 mt-3 text-xs font-black text-slate-600 dark:text-slate-300">البرامج / الأنشطة</p>
        {programLoading ? <p className="rounded-xl bg-white p-3 text-xs font-bold text-slate-500 dark:bg-slate-950 dark:text-slate-400">جارٍ تحميل البرامج...</p> : availablePrograms.length ? <div className="grid gap-2 sm:grid-cols-2">{availablePrograms.map((program) => { const selected = selectedPrograms.some((item) => item.domainServiceSlug === program.domainServiceSlug && item.value === program.value); const domainTitle = ACTIVITY_PROGRAM_DOMAINS.find((domain) => domain.serviceSlug === program.domainServiceSlug)?.shortLabel || ""; return <button type="button" key={`${program.domainServiceSlug}:${program.value}`} aria-pressed={selected} onClick={() => toggleProgram(program)} className={`rounded-xl border px-3 py-2 text-right text-xs font-black transition ${selected ? "border-sky-700 bg-sky-700 text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"}`}><span className="block">{program.label}</span><span className={`mt-1 block text-[10px] ${selected ? "text-sky-100" : "text-slate-400"}`}>{domainTitle}</span></button>; })}</div> : <p className="rounded-xl border border-dashed border-slate-200 p-3 text-xs font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">اختر مجالًا لعرض برامجه.</p>}
        {hasOtherProgram ? <div className="mt-3"><label className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200">اسم البرنامج الآخر</label><input value={manualProgramName} onChange={(event) => setManualProgramName(event.target.value)} placeholder="اكتب اسم البرنامج" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-sm font-bold dark:border-slate-700 dark:bg-slate-950" /></div> : null}
      </fieldset>

      <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/60"><legend className="px-1 text-xs font-black text-slate-500">المادة</legend><div className="mt-1 grid gap-3 sm:grid-cols-2 sm:items-end"><label className="block text-sm font-black text-slate-700 dark:text-slate-200">المادة<input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="اسم المادة" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-sm font-bold dark:border-slate-700 dark:bg-slate-950" /></label><fieldset><legend className="mb-2 text-sm font-black text-slate-700 dark:text-slate-200">نوع المادة</legend><div className="grid grid-cols-2 gap-2">{(["أساسية", "10%"] as const).map((item) => <button type="button" key={item} aria-pressed={materialType === item} onClick={() => setMaterialType(item)} className={`h-10 rounded-xl border text-sm font-black transition ${materialType === item ? "border-sky-700 bg-sky-700 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"}`}>{item}</button>)}</div></fieldset></div></fieldset>

      <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-900/60"><legend className="px-1 text-xs font-black text-slate-500">المنفذ</legend><label className="mt-1 block text-sm font-black text-slate-700 dark:text-slate-200">اسم المعلم<input list="weekly-activity-teachers" value={teacherName} onChange={(event) => setTeacherName(event.target.value)} placeholder="اكتب اسم المعلم" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-sm font-bold dark:border-slate-700 dark:bg-slate-950" /></label><datalist id="weekly-activity-teachers">{teachers.map((teacher) => <option key={teacher} value={teacher} />)}</datalist></fieldset>
      {error ? <p className="rounded-xl bg-rose-50 p-3 text-xs font-black text-rose-700 dark:bg-rose-950/20 dark:text-rose-200">{error}</p> : null}
      <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => void save()} disabled={saving || programLoading || !selectedPrograms.length || !teacherName.trim() || (hasOtherProgram && !manualProgramName.trim())} className="h-12 rounded-2xl bg-sky-700 text-sm font-black text-white disabled:opacity-50">{saving ? "جارٍ الحفظ..." : "حفظ الخلية"}</button><button type="button" onClick={onClose} disabled={saving || deleting} className="h-12 rounded-2xl border border-slate-200 text-sm font-black text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">إلغاء</button></div>
      {entry ? <button type="button" onClick={() => setConfirmDelete(true)} disabled={saving || deleting} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-rose-50 text-sm font-black text-rose-700 ring-1 ring-rose-100 dark:bg-rose-950/20 dark:text-rose-200 dark:ring-rose-900/40"><Trash2 className="h-4 w-4" />حذف الإدخال</button> : null}
    </div>
    <SmartActionModal open={confirmDelete} title="تأكيد حذف الإدخال" description="سيتم حذف النشاط المحدد فقط." variant="danger" confirmLabel="حذف الإدخال" loading={deleting} portal onClose={() => setConfirmDelete(false)} onConfirm={() => void remove()} />
  </SmartActionModal>;
}
