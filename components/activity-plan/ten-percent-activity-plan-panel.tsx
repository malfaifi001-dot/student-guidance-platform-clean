"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit3, Plus, Trash2 } from "lucide-react";
import { SmartActionModal } from "@/components/ui/smart-action-modal";
import { ACTIVITY_PLAN_OTHER_PROGRAM_VALUE } from "@/lib/activity-plan/activity-plan-program-value";
import { getActivityPlanProgramByKey } from "@/lib/activity-plan/activity-plan-programs";
import {
  ActivityPlanTenPercentRow,
  TenPercentDomainOption,
  TenPercentDomainValue,
  TenPercentProgramValue,
  formatTenPercentWeeks,
} from "@/lib/activity-plan/ten-percent-activity-plan-types";

type Draft = {
  domains: TenPercentDomainValue[];
  programs: TenPercentProgramValue[];
  periodCount: string;
  executionWeeks: number[];
  subject: string;
  grades: string[];
  teacherNames: string[];
};

const emptyDraft: Draft = {
  domains: [],
  programs: [],
  periodCount: "",
  executionWeeks: [],
  subject: "",
  grades: [],
  teacherNames: [],
};

function rowToDraft(row: ActivityPlanTenPercentRow | null): Draft {
  if (!row) return { ...emptyDraft, domains: [], programs: [], executionWeeks: [], grades: [], teacherNames: [] };
  return {
    domains: row.domains,
    programs: row.programs,
    periodCount: row.periodCount,
    executionWeeks: row.executionWeeks,
    subject: row.subject,
    grades: row.grades,
    teacherNames: row.teacherNames,
  };
}

function domainStyle(domain: TenPercentDomainValue) {
  return getActivityPlanProgramByKey(domain.slug) || { colorClass: "border-slate-200 bg-slate-50 text-slate-900" };
}

export function TenPercentActivityPlanPanel({ stage }: { stage: string }) {
  const [rows, setRows] = useState<ActivityPlanTenPercentRow[]>([]);
  const [domains, setDomains] = useState<TenPercentDomainOption[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [editing, setEditing] = useState<ActivityPlanTenPercentRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    if (!stage) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/dashboard/activity-plan/ten-percent?stage=${encodeURIComponent(stage)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "تعذر تحميل خطة 10%.");
      setRows(Array.isArray(payload.rows) ? payload.rows : []);
      setDomains(Array.isArray(payload.domains) ? payload.domains : []);
      setGrades(Array.isArray(payload.grades) ? payload.grades : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل خطة 10%.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [stage]);

  const openNew = () => {
    setEditing(null);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (row: ActivityPlanTenPercentRow) => {
    setEditing(row);
    setError("");
    setModalOpen(true);
  };

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-3 shadow-sm dark:border-amber-900/70 dark:bg-amber-950/10 md:p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-amber-950 dark:text-amber-100">الخطة الفصلية (10%)</h3>
          <p className="mt-1 text-xs font-bold text-amber-800/80 dark:text-amber-200/80">خطة مستقلة للبرامج المنفذة ضمن مادة 10% للمرحلة المحددة.</p>
        </div>
        <button type="button" onClick={openNew} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-700 px-4 text-sm font-black text-white shadow-sm transition hover:bg-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
          <Plus className="h-4 w-4" /> إضافة صف
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-amber-200 bg-white shadow-sm dark:border-amber-900/60 dark:bg-slate-950" style={{ WebkitOverflowScrolling: "touch" }}>
        <table className="min-w-[1080px] w-full border-collapse text-right" dir="rtl">
          <thead className="bg-amber-100/80 text-xs font-black text-amber-950 dark:bg-amber-950/50 dark:text-amber-100">
            <tr>
              <th className="border-b border-l border-amber-200 p-3">المجال</th>
              <th className="border-b border-l border-amber-200 p-3">البرنامج</th>
              <th className="border-b border-l border-amber-200 p-3">عدد الحصص</th>
              <th className="border-b border-l border-amber-200 p-3">أسبوع التنفيذ</th>
              <th className="border-b border-l border-amber-200 p-3">مادة 10%</th>
              <th className="border-b border-l border-amber-200 p-3">الصف</th>
              <th className="border-b border-l border-amber-200 p-3">المعلم</th>
              <th className="border-b border-amber-200 p-3">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="align-top transition hover:bg-amber-50/50 dark:hover:bg-amber-950/20">
                <td className="border-b border-l border-amber-100 p-3"><div className="flex flex-wrap gap-1.5">{row.domains.map((domain) => <span key={domain.serviceSlug} className={`rounded-lg border px-2 py-1 text-[11px] font-black ${domainStyle(domain).colorClass}`}>{domain.title}</span>)}</div></td>
                <td className="border-b border-l border-amber-100 p-3 text-sm font-bold text-slate-800 dark:text-slate-100"><div className="space-y-1">{row.programs.map((program) => <div key={`${program.domainServiceSlug}-${program.value}`}><span className="text-[10px] text-slate-500 dark:text-slate-400">{program.domainTitle}</span><p>{program.name}</p></div>)}</div></td>
                <td className="border-b border-l border-amber-100 p-3 text-center text-sm font-black text-slate-800 dark:text-slate-100">{row.periodCount || "—"}</td>
                <td className="border-b border-l border-amber-100 p-3 text-center text-sm font-black text-slate-800 dark:text-slate-100" dir="ltr">{formatTenPercentWeeks(row.executionWeeks)}</td>
                <td className="border-b border-l border-amber-100 p-3 text-sm font-bold text-slate-800 dark:text-slate-100">{row.subject || "—"}</td>
                <td className="border-b border-l border-amber-100 p-3 text-sm font-bold text-slate-800 dark:text-slate-100"><div className="whitespace-pre-line">{row.grades.join("\n") || "—"}</div></td>
                <td className="border-b border-l border-amber-100 p-3 text-sm font-bold text-slate-800 dark:text-slate-100"><div className="whitespace-pre-line">{row.teacherNames.join("\n") || "—"}</div></td>
                <td className="border-b border-amber-100 p-3 text-center"><button type="button" onClick={() => openEdit(row)} className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-amber-100 px-3 py-2 text-xs font-black text-amber-900 transition hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-100"><Edit3 className="h-4 w-4" /> تعديل</button></td>
              </tr>
            ))}
            {!rows.length && !loading ? <tr><td colSpan={8} className="p-10 text-center text-sm font-bold text-slate-500 dark:text-slate-400">لا توجد صفوف محفوظة لهذه المرحلة بعد.</td></tr> : null}
          </tbody>
        </table>
      </div>
      {loading ? <p className="py-4 text-center text-xs font-black text-amber-800 dark:text-amber-200">جار تحميل خطة 10%...</p> : null}
      {error ? <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-black text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200" role="alert">{error}</p> : null}
      <TenPercentActivityPlanModal
        open={modalOpen}
        row={editing}
        stage={stage}
        domains={domains}
        grades={grades}
        onClose={() => setModalOpen(false)}
        onSaved={(row) => { setRows((current) => editing ? current.map((item) => item.id === row.id ? row : item) : [...current, row]); setModalOpen(false); setEditing(null); }}
        onDeleted={(id) => { setRows((current) => current.filter((row) => row.id !== id)); setModalOpen(false); setEditing(null); }}
      />
    </section>
  );
}

function TenPercentActivityPlanModal({ open, row, stage, domains, grades, onClose, onSaved, onDeleted }: { open: boolean; row: ActivityPlanTenPercentRow | null; stage: string; domains: TenPercentDomainOption[]; grades: string[]; onClose: () => void; onSaved: (row: ActivityPlanTenPercentRow) => void; onDeleted: (id: string) => void }) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraft(rowToDraft(row));
    setError("");
    setConfirmDelete(false);
  }, [open, row]);

  const selectedDomainSlugs = useMemo(() => new Set(draft.domains.map((domain) => domain.serviceSlug)), [draft.domains]);
  const selectedOtherDomains = useMemo(() => new Set(draft.programs.filter((program) => program.isOther).map((program) => program.domainServiceSlug)), [draft.programs]);

  const toggleDomain = (option: TenPercentDomainOption) => {
    setDraft((current) => {
      const exists = current.domains.some((domain) => domain.serviceSlug === option.serviceSlug);
      return exists
        ? { ...current, domains: current.domains.filter((domain) => domain.serviceSlug !== option.serviceSlug), programs: current.programs.filter((program) => program.domainServiceSlug !== option.serviceSlug) }
        : { ...current, domains: [...current.domains, { slug: option.slug, serviceSlug: option.serviceSlug, title: option.title }] };
    });
  };

  const toggleProgram = (domain: TenPercentDomainOption, option: { value: string; label: string; isOther: boolean }) => {
    setDraft((current) => {
      const exists = current.programs.some((program) => program.domainServiceSlug === domain.serviceSlug && program.value === option.value);
      return {
        ...current,
        programs: exists
          ? current.programs.filter((program) => !(program.domainServiceSlug === domain.serviceSlug && program.value === option.value))
          : [...current.programs, { domainSlug: domain.slug, domainServiceSlug: domain.serviceSlug, domainTitle: domain.title, value: option.value, name: option.isOther ? "" : option.label, isOther: option.isOther }],
      };
    });
  };

  const toggleWeek = (week: number) => setDraft((current) => ({ ...current, executionWeeks: current.executionWeeks.includes(week) ? current.executionWeeks.filter((item) => item !== week) : [...current.executionWeeks, week].sort((left, right) => left - right) }));
  const toggleGrade = (grade: string) => setDraft((current) => ({ ...current, grades: current.grades.includes(grade) ? current.grades.filter((item) => item !== grade) : [...current.grades, grade] }));
  const setTeacherNames = (value: string) => setDraft((current) => ({ ...current, teacherNames: value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) }));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/activity-plan/ten-percent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row?.id, stage, ...draft }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "تعذر حفظ صف خطة 10%.");
      onSaved(payload.row);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حفظ صف خطة 10%.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!row) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/activity-plan/ten-percent", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "تعذر حذف الصف.");
      onDeleted(row.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حذف الصف.");
    } finally {
      setDeleting(false);
    }
  };

  return <SmartActionModal open={open} title={row ? "تعديل صف الخطة الفصلية (10%)" : "إضافة صف للخطة الفصلية (10%)"} description={stage} portal onClose={onClose} showFooter={false}>
    <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1" dir="rtl">
      <fieldset><legend className="mb-2 text-sm font-black text-slate-700 dark:text-slate-200">المجال</legend><div className="grid gap-2 sm:grid-cols-2">{domains.map((domain) => <label key={domain.serviceSlug} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm font-bold transition ${selectedDomainSlugs.has(domain.serviceSlug) ? `${domainStyle(domain).colorClass} ring-2 ring-amber-300` : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"}`}><input type="checkbox" checked={selectedDomainSlugs.has(domain.serviceSlug)} onChange={() => toggleDomain(domain)} />{domain.title}</label>)}</div></fieldset>
      {draft.domains.map((domain) => { const domainOptions = domains.find((option) => option.serviceSlug === domain.serviceSlug); return <section key={domain.serviceSlug} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900"><h4 className="mb-2 text-sm font-black text-slate-800 dark:text-slate-100">برامج {domain.title}</h4><div className="grid gap-2 sm:grid-cols-2">{(domainOptions?.options || []).map((option) => { const checked = draft.programs.some((program) => program.domainServiceSlug === domain.serviceSlug && program.value === option.value); return <label key={option.value} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg bg-white px-2 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-700"><input type="checkbox" checked={checked} onChange={() => toggleProgram(domainOptions as TenPercentDomainOption, option)} />{option.label}</label>; })}</div>{selectedOtherDomains.has(domain.serviceSlug) ? <input value={draft.programs.find((program) => program.domainServiceSlug === domain.serviceSlug && program.isOther)?.name || ""} onChange={(event) => setDraft((current) => ({ ...current, programs: current.programs.map((program) => program.domainServiceSlug === domain.serviceSlug && program.isOther ? { ...program, name: event.target.value } : program) }))} placeholder="اكتب اسم البرنامج الآخر" className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white" /> : null}</section>; })}
      <label className="block text-sm font-black text-slate-700 dark:text-slate-200">عدد الحصص<input value={draft.periodCount} onChange={(event) => setDraft((current) => ({ ...current, periodCount: event.target.value }))} placeholder="مثال: 2 أو حصتان" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
      <fieldset><legend className="mb-2 text-sm font-black text-slate-700 dark:text-slate-200">أسبوع التنفيذ (1–18)</legend><div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{Array.from({ length: 18 }, (_, index) => index + 1).map((week) => <label key={week} className="flex min-h-10 cursor-pointer items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"><input type="checkbox" checked={draft.executionWeeks.includes(week)} onChange={() => toggleWeek(week)} />{week}</label>)}</div></fieldset>
      <label className="block text-sm font-black text-slate-700 dark:text-slate-200">مادة 10%<input value={draft.subject} onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))} placeholder="اكتب المادة المرتبطة بالخطة" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
      <fieldset><legend className="mb-2 text-sm font-black text-slate-700 dark:text-slate-200">الصفوف</legend><div className="grid gap-2 sm:grid-cols-2">{grades.map((grade) => <label key={grade} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"><input type="checkbox" checked={draft.grades.includes(grade)} onChange={() => toggleGrade(grade)} />{grade}</label>)}</div></fieldset>
      <label className="block text-sm font-black text-slate-700 dark:text-slate-200">المعلمون<textarea value={draft.teacherNames.join("\n")} onChange={(event) => setTeacherNames(event.target.value)} rows={3} placeholder="اكتب اسم كل معلم في سطر مستقل" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-black text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200" role="alert">{error}</p> : null}
      <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => void save()} disabled={saving || !draft.domains.length || !draft.programs.length || !draft.executionWeeks.length} className="min-h-11 rounded-xl bg-amber-700 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50">{saving ? "جار الحفظ..." : "حفظ الصف"}</button><button type="button" onClick={onClose} disabled={saving || deleting} className="min-h-11 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">إلغاء</button></div>
      {row ? <button type="button" onClick={() => setConfirmDelete(true)} disabled={saving || deleting} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-50 text-sm font-black text-rose-700 dark:bg-rose-950/30 dark:text-rose-200"><Trash2 className="h-4 w-4" />حذف الصف</button> : null}
      <SmartActionModal open={confirmDelete} title="تأكيد حذف الصف" description="سيتم حذف هذا الصف من خطة 10% فقط." variant="danger" confirmLabel="حذف الصف" loading={deleting} portal onClose={() => setConfirmDelete(false)} onConfirm={() => void remove()} />
    </div>
  </SmartActionModal>;
}
