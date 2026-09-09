"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Edit3, Plus, Trash2 } from "lucide-react";
import { SmartActionModal } from "@/components/ui/smart-action-modal";
import { SemesterActivityPlanCopyModal } from "@/components/activity-plan/semester-activity-plan-copy-modal";
import { ACTIVITY_PLAN_OTHER_PROGRAM_VALUE } from "@/lib/activity-plan/activity-plan-program-value";
import { getActivityPlanProgramByKey } from "@/lib/activity-plan/activity-plan-programs";
import {
  ActivityPlanTenPercentRow,
  TenPercentDomainOption,
  TenPercentDomainValue,
  TenPercentProgramValue,
  formatTenPercentWeeks,
  getTenPercentGradeOptions,
} from "@/lib/activity-plan/ten-percent-activity-plan-types";
import { ACTIVITY_PLAN_SECTIONS } from "@/lib/activity-plan/activity-plan-stages";

type Draft = {
  domains: TenPercentDomainValue[];
  programs: TenPercentProgramValue[];
  periodCount: string;
  executionWeeks: number[];
  subject: string;
  grades: string[];
  teacherNames: string[];
  section: string;
  materialType: "أساسية" | "10%";
};

const emptyDraft: Draft = {
  domains: [],
  programs: [],
  periodCount: "",
  executionWeeks: [],
  subject: "",
  grades: [],
  teacherNames: [],
  section: "",
  materialType: "10%",
};

const ACTIVITY_PLAN_SECTION_LABELS = ["أ", "ب", "ج", "د", "هـ", "و", "ز"] as const;
const DEFAULT_ACTIVITY_PLAN_SECTIONS = ACTIVITY_PLAN_SECTIONS.slice(0, 2);

function getSectionLabel(section: string) {
  const index = ACTIVITY_PLAN_SECTIONS.indexOf(section as (typeof ACTIVITY_PLAN_SECTIONS)[number]);
  return index >= 0 ? ACTIVITY_PLAN_SECTION_LABELS[index] : section;
}

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
    section: row.grades[0]?.split("::")[1] || "",
    materialType: row.materialType || "10%",
  };
}

function domainStyle(domain: TenPercentDomainValue) {
  return getActivityPlanProgramByKey(domain.slug) || { colorClass: "border-slate-200 bg-slate-50 text-slate-900" };
}

function materialTypeLabel(value: ActivityPlanTenPercentRow["materialType"]) {
  return value === "10%" ? "10%" : "أساسية";
}

export function TenPercentActivityPlanPanel({ stage, allowedStages }: { stage: string; allowedStages: string[] }) {
  const [rows, setRows] = useState<ActivityPlanTenPercentRow[]>([]);
  const [domains, setDomains] = useState<TenPercentDomainOption[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [editing, setEditing] = useState<ActivityPlanTenPercentRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [availableSections, setAvailableSections] = useState<string[]>([...DEFAULT_ACTIVITY_PLAN_SECTIONS]);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [sectionToAdd, setSectionToAdd] = useState("");
  const [sectionRemovalPending, setSectionRemovalPending] = useState<string | null>(null);
  const [checkingSection, setCheckingSection] = useState<string | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);

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
  useEffect(() => {
    setSelectedGrade((current) => grades.includes(current) ? current : grades[0] || "");
    setSelectedSection((current) => current || ACTIVITY_PLAN_SECTIONS[0]);
  }, [stage, grades]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storageKey = `activity-plan-semester-sections:${stage}:${selectedGrade || "unclassified"}`;
    try {
      const stored = JSON.parse(window.localStorage.getItem(storageKey) || "null");
      const next = Array.isArray(stored)
        ? stored.filter((value): value is string => typeof value === "string" && ACTIVITY_PLAN_SECTIONS.includes(value as (typeof ACTIVITY_PLAN_SECTIONS)[number]))
        : [...DEFAULT_ACTIVITY_PLAN_SECTIONS];
      setAvailableSections(next.length ? next : [...DEFAULT_ACTIVITY_PLAN_SECTIONS]);
    } catch {
      setAvailableSections([...DEFAULT_ACTIVITY_PLAN_SECTIONS]);
    }
  }, [stage, selectedGrade]);

  useEffect(() => {
    if (availableSections.includes(selectedSection)) return;
    setSelectedSection(availableSections[0] || "");
  }, [availableSections, selectedSection]);

  const persistSections = (next: string[]) => {
    const normalized = next.filter((section, index, values) => values.indexOf(section) === index);
    setAvailableSections(normalized);
    if (typeof window !== "undefined") {
      const storageKey = `activity-plan-semester-sections:${stage}:${selectedGrade || "unclassified"}`;
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(normalized));
      } catch {
        // Section visibility remains usable for this session when storage is unavailable.
      }
    }
  };

  const addSection = () => {
    if (!sectionToAdd || availableSections.includes(sectionToAdd)) return;
    persistSections([...availableSections, sectionToAdd]);
    setSelectedSection(sectionToAdd);
    setSectionToAdd("");
    setAddSectionOpen(false);
  };

  const removeSectionFromList = (section: string) => {
    const next = availableSections.filter((value) => value !== section);
    if (!next.length) return;
    persistSections(next);
    if (selectedSection === section) setSelectedSection(next[0]);
  };

  const requestSectionRemoval = async (section: string) => {
    if (availableSections.length <= 1) return;
    setCheckingSection(section);
    try {
      const response = await fetch(`/api/dashboard/activity-plan/ten-percent?stage=${encodeURIComponent(stage)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "تعذر التحقق من بيانات الفصل.");
      const savedRows = Array.isArray(payload.rows) ? payload.rows as ActivityPlanTenPercentRow[] : rows;
      const hasSavedData = Boolean(selectedGrade) && savedRows.some((row) => row.grades.some((value) => {
        const [grade, rowSection] = value.split("::");
        return grade === selectedGrade && rowSection === section;
      }));
      if (hasSavedData) setSectionRemovalPending(section);
      else removeSectionFromList(section);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر التحقق من بيانات الفصل.");
    } finally {
      setCheckingSection(null);
    }
  };

  const scopedRows = rows.filter((row) => {
    if (!selectedGrade) return row.grades.length === 0;
    return row.grades.some((value) => {
      const [grade, section] = value.split("::");
      return grade === selectedGrade && (section || "") === selectedSection;
    });
  });
  const legacyRows = rows.filter((row) => row.grades.some((value) => !value.includes("::")));

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
    <section className="ten-percent-activity-plan-panel min-w-0 max-w-full p-0 [&>div:first-child>p:first-child]:hidden">
      <div className="mb-2">
        <div className="flex min-w-0 max-w-full flex-nowrap gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]" aria-label="اختيار الصف">{grades.map((grade) => <button type="button" key={grade} aria-pressed={selectedGrade === grade} onClick={() => setSelectedGrade(grade)} className={`min-h-9 shrink-0 rounded-lg px-3 text-xs font-black transition ${selectedGrade === grade ? "bg-sky-700 text-white shadow-sm" : "bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-sky-50"}`}>{grade}</button>)}</div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-label="اختيار الفصل">
          {availableSections.map((section) => <div key={section} className="relative flex items-center">
            <button type="button" aria-pressed={selectedSection === section} onClick={() => setSelectedSection(section)} className={`h-8 min-w-8 rounded-lg px-2 text-xs font-black transition ${selectedSection === section ? "bg-sky-700 text-white shadow-sm" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-sky-50"}`}>{getSectionLabel(section)}</button>
            {availableSections.length > 1 ? <button type="button" aria-label={`إزالة الفصل ${getSectionLabel(section)}`} title="إزالة الفصل" onClick={(event) => { event.stopPropagation(); void requestSectionRemoval(section); }} disabled={checkingSection === section} className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-white text-[10px] font-black text-rose-600 shadow ring-1 ring-rose-200 transition hover:bg-rose-50 disabled:opacity-50">×</button> : null}
          </div>)}
          <button type="button" aria-label="إضافة فصل" title="إضافة فصل" onClick={() => { const firstMissing = ACTIVITY_PLAN_SECTIONS.find((section) => !availableSections.includes(section)) || ""; setSectionToAdd(firstMissing); setAddSectionOpen(true); }} disabled={!selectedGrade || availableSections.length >= ACTIVITY_PLAN_SECTIONS.length} className="grid h-8 min-w-8 place-items-center rounded-lg border border-dashed border-sky-300 bg-sky-50 px-2 text-sm font-black text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-40">+</button>
        </div>
        <p className="mt-2 break-words text-sm font-black text-slate-800 dark:text-slate-100">{selectedGrade ? `${stage} — ${selectedGrade} ${selectedSection}` : `${stage} — بيانات سابقة غير مصنفة`}</p>
      </div>
      <div className="mb-2 flex justify-end gap-1.5">
        <button type="button" onClick={() => setCopyOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 text-xs font-black text-sky-800 transition hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200">
          <Copy className="h-4 w-4" /> نسخ الخطة
        </button>
        <button type="button" onClick={openNew} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0F7FA8] px-3 text-xs font-black text-white transition hover:bg-[#0B6B8E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E8FB8]">
          <Plus className="h-4 w-4" /> إضافة نشاط
        </button>
      </div>

      <div className="min-w-0 max-w-full overflow-x-auto rounded-md border border-[#D7E3EA] bg-white dark:border-sky-900/60 dark:bg-slate-950" style={{ WebkitOverflowScrolling: "touch" }}>
        <table className="min-w-[560px] w-full border-collapse text-right [&_th]:p-1.5 [&_td]:p-1.5 sm:min-w-[1080px] sm:[&_th]:p-2 sm:[&_td]:p-2" dir="rtl">
          <thead className="bg-[#EAF4FA] text-[11px] font-black text-[#0F5F7A] dark:bg-sky-950/50 dark:text-sky-100">
            <tr>
              <th className="border-b border-l border-[#B9D8E8] p-3">المجال</th>
              <th className="border-b border-l border-[#B9D8E8] p-3">البرنامج / النشاط</th>
              <th className="hidden border-b border-l border-[#B9D8E8] p-3 sm:table-cell">عدد الحصص</th>
              <th className="hidden border-b border-l border-[#B9D8E8] p-3 sm:table-cell">أسابيع التنفيذ</th>
              <th className="border-b border-l border-[#B9D8E8] p-3">المادة والنوع</th>
              <th className="border-b border-l border-[#B9D8E8] p-3">المعلم</th>
              <th className="border-b border-[#B9D8E8] p-3">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {scopedRows.map((row) => (
              <tr key={row.id} className="align-top transition hover:bg-[#EAF4FA] dark:hover:bg-sky-950/20">
                <td className="border-b border-l border-[#DCECF6] p-3"><div className="flex flex-wrap gap-1.5">{row.domains.map((domain) => <span key={domain.serviceSlug} className={`rounded-lg border px-2 py-1 text-[11px] font-black ${domainStyle(domain).colorClass}`}>{domain.title}</span>)}</div></td>
                <td className="border-b border-l border-[#DCECF6] p-3 text-sm font-bold text-slate-800 dark:text-slate-100"><div className="space-y-1">{row.programs.map((program) => <div key={`${program.domainServiceSlug}-${program.value}`}><span className="text-[10px] text-slate-500 dark:text-slate-400">{program.domainTitle}</span><p>{program.name}</p></div>)}</div></td>
                <td className="hidden border-b border-l border-[#DCECF6] p-3 text-center text-sm font-black text-slate-800 dark:text-slate-100 sm:table-cell">{row.periodCount || "—"}</td>
                <td className="hidden border-b border-l border-[#DCECF6] p-3 text-center text-sm font-black text-slate-800 dark:text-slate-100 sm:table-cell" dir="ltr">{formatTenPercentWeeks(row.executionWeeks)}</td>
                <td className="border-b border-l border-[#DCECF6] p-3 text-sm font-bold text-slate-800 dark:text-slate-100">{row.subject || "—"} <span className={row.materialType === "10%" ? "text-amber-700 dark:text-amber-300" : "text-sky-700 dark:text-sky-300"}>({materialTypeLabel(row.materialType)})</span></td>
                <td className="border-b border-l border-[#DCECF6] p-3 text-sm font-bold text-slate-800 dark:text-slate-100"><div className="whitespace-pre-line">{row.teacherNames.join("\n") || "—"}</div></td>
                <td className="border-b border-[#DCECF6] p-3 text-center"><button type="button" title="تعديل الصف" aria-label="تعديل الصف" onClick={() => openEdit(row)} className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg bg-[#EAF4FA] px-2 py-1.5 text-xs font-black text-[#0F5F7A] transition hover:bg-[#DCECF6] sm:min-h-10 sm:min-w-10 sm:rounded-xl sm:px-2.5 sm:py-2 dark:bg-sky-950/60 dark:text-sky-100"><Edit3 className="h-4 w-4" /><span className="sr-only">تعديل</span></button></td>
              </tr>
            ))}
            {!scopedRows.length && !loading ? <tr><td colSpan={7} className="p-10 text-center text-sm font-bold text-slate-500 dark:text-slate-400">لا توجد صفوف محفوظة لهذا الصف والفصل بعد.</td></tr> : null}
          </tbody>
        </table>
      </div>
      {legacyRows.length ? <p className="mt-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">توجد {legacyRows.length} بيانات سابقة غير مرتبطة بفصل محدد، وتم إبقاؤها ظاهرة هنا دون تعديل.</p> : null}
      {loading ? <p className="py-2 text-center text-xs font-black text-[#0F5F7A] dark:text-sky-200">جار تحميل الخطة الفصلية...</p> : null}
      {error ? <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-black text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200" role="alert">{error}</p> : null}
      <SmartActionModal open={addSectionOpen} title="إضافة فصل" description="اختر فصلًا لإظهاره في هذه الخطة." portal onClose={() => setAddSectionOpen(false)} showFooter={false}>
        <div className="space-y-3" dir="rtl">
          <select value={sectionToAdd} onChange={(event) => setSectionToAdd(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-800">
            <option value="">اختر الفصل</option>
            {ACTIVITY_PLAN_SECTIONS.filter((section) => !availableSections.includes(section)).map((section) => <option key={section} value={section}>{getSectionLabel(section)}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2"><button type="button" onClick={addSection} disabled={!sectionToAdd} className="min-h-11 rounded-xl bg-sky-700 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">إضافة</button><button type="button" onClick={() => setAddSectionOpen(false)} className="min-h-11 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-600">إلغاء</button></div>
        </div>
      </SmartActionModal>
      <SmartActionModal open={Boolean(sectionRemovalPending)} title="تأكيد حذف الفصل" description="هذا الفصل يحتوي على بيانات محفوظة. حذف الفصل سيؤثر على البيانات المرتبطة به." variant="danger" confirmLabel="حذف الفصل" cancelLabel="إلغاء" portal onClose={() => setSectionRemovalPending(null)} onConfirm={() => { if (sectionRemovalPending) removeSectionFromList(sectionRemovalPending); setSectionRemovalPending(null); }} />
      <SemesterActivityPlanCopyModal open={copyOpen} allowedStages={allowedStages.length ? allowedStages : [stage]} currentStage={stage} currentGrade={selectedGrade} currentSection={selectedSection} onClose={() => setCopyOpen(false)} onCopied={() => void load()} />
      <TenPercentActivityPlanModal
        open={modalOpen}
        row={editing}
        stage={stage}
        allowedStages={allowedStages}
        domains={domains}
        grades={grades}
        selectedGrade={selectedGrade}
        selectedSection={selectedSection}
        onClose={() => setModalOpen(false)}
        onSaved={(row) => { if (row.stage !== stage) void load(); else setRows((current) => editing ? current.map((item) => item.id === row.id ? row : item) : [...current, row]); setModalOpen(false); setEditing(null); }}
        onDeleted={(id) => { setRows((current) => current.filter((row) => row.id !== id)); setModalOpen(false); setEditing(null); }}
      />
    </section>
  );
}

function TenPercentActivityPlanModal({ open, row, stage, allowedStages, domains, grades, selectedGrade, selectedSection, onClose, onSaved, onDeleted }: { open: boolean; row: ActivityPlanTenPercentRow | null; stage: string; allowedStages: string[]; domains: TenPercentDomainOption[]; grades: string[]; selectedGrade: string; selectedSection: string; onClose: () => void; onSaved: (row: ActivityPlanTenPercentRow) => void; onDeleted: (id: string) => void }) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [destinationStage, setDestinationStage] = useState(stage);
  const [destinationGrade, setDestinationGrade] = useState(selectedGrade);
  const [destinationSection, setDestinationSection] = useState(selectedSection);
  const [originDestination, setOriginDestination] = useState("");
  const destinationGrades = useMemo(() => getTenPercentGradeOptions(destinationStage), [destinationStage]);

  useEffect(() => {
    if (!open) return;
    const savedDestination = row?.grades.find((value) => value === `${selectedGrade}::${selectedSection}`) || row?.grades.find((value) => value.includes("::")) || row?.grades[0] || "";
    const [savedGrade, savedSection] = savedDestination.split("::");
    const nextStage = row?.stage || stage;
    const nextGradeOptions = getTenPercentGradeOptions(nextStage);
    setDestinationStage(nextStage);
    setDestinationGrade(nextGradeOptions.includes(savedGrade) ? savedGrade : selectedGrade || nextGradeOptions[0] || "");
    setDestinationSection(savedSection || selectedSection || ACTIVITY_PLAN_SECTIONS[0]);
    setOriginDestination(savedDestination.includes("::") && savedGrade ? `${savedGrade}::${savedSection}` : "");
    setDraft({ ...rowToDraft(row), grades: savedGrade ? [`${savedGrade}${savedSection ? `::${savedSection}` : ""}`] : (selectedGrade ? [`${selectedGrade}${selectedSection ? `::${selectedSection}` : ""}`] : rowToDraft(row).grades), section: savedSection || selectedSection || rowToDraft(row).section });
    setError("");
    setConfirmDelete(false);
  }, [open, row, selectedGrade, selectedSection]);

  useEffect(() => {
    if (destinationGrades.includes(destinationGrade)) return;
    setDestinationGrade(destinationGrades[0] || "");
  }, [destinationGrade, destinationGrades]);

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
  const setTeacherNames = (value: string) => setDraft((current) => ({ ...current, teacherNames: value.split(/\r?\n/) }));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const scopedGrades = destinationGrade ? [`${destinationGrade}${destinationSection ? `::${destinationSection}` : ""}`] : [];
      const response = await fetch("/api/dashboard/activity-plan/ten-percent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row?.id, ...draft, stage: destinationStage, grade: destinationGrade, section: destinationSection, previousDestination: originDestination, grades: scopedGrades }) });
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

  return <SmartActionModal open={open} title={row ? "تعديل نشاط الخطة الفصلية" : "إضافة نشاط للخطة الفصلية"} description={stage} portal onClose={onClose} showFooter={false}>
    <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1" dir="rtl">
      <fieldset><legend className="mb-2 text-sm font-black text-slate-700 dark:text-slate-200">وجهة النشاط</legend><div className="grid gap-2 sm:grid-cols-3"><select value={destinationStage} onChange={(event) => { const next = event.target.value; setDestinationStage(next); setDestinationGrade(getTenPercentGradeOptions(next)[0] || ""); }} className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold"><option value="">المرحلة</option>{allowedStages.map((item) => <option key={item} value={item}>{item}</option>)}</select><select value={destinationGrade} onChange={(event) => setDestinationGrade(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold"><option value="">الصف</option>{destinationGrades.map((item) => <option key={item} value={item}>{item}</option>)}</select><select value={destinationSection} onChange={(event) => setDestinationSection(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold"><option value="">الفصل</option>{ACTIVITY_PLAN_SECTIONS.map((item) => <option key={item} value={item}>{getSectionLabel(item)}</option>)}</select></div></fieldset>
      <fieldset><legend className="mb-2 text-sm font-black text-slate-700 dark:text-slate-200">المجال</legend><div className="grid gap-2 sm:grid-cols-2">{domains.map((domain) => <label key={domain.serviceSlug} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm font-bold transition ${selectedDomainSlugs.has(domain.serviceSlug) ? `${domainStyle(domain).colorClass} ring-2 ring-amber-300` : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"}`}><input type="checkbox" checked={selectedDomainSlugs.has(domain.serviceSlug)} onChange={() => toggleDomain(domain)} />{domain.title}</label>)}</div></fieldset>
      {draft.domains.map((domain) => { const domainOptions = domains.find((option) => option.serviceSlug === domain.serviceSlug); return <section key={domain.serviceSlug} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900"><h4 className="mb-2 text-sm font-black text-slate-800 dark:text-slate-100">برامج {domain.title}</h4><div className="grid gap-2 sm:grid-cols-2">{(domainOptions?.options || []).map((option) => { const checked = draft.programs.some((program) => program.domainServiceSlug === domain.serviceSlug && program.value === option.value); return <label key={option.value} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg bg-white px-2 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-700"><input type="checkbox" checked={checked} onChange={() => toggleProgram(domainOptions as TenPercentDomainOption, option)} />{option.label}</label>; })}</div></section>; })}
      <label className="block text-sm font-black text-slate-700">المادة<input value={draft.subject} onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))} placeholder="اكتب المادة المرتبطة بالخطة" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold" /></label>
      <fieldset><legend className="mb-2 text-sm font-black text-slate-700">نوع المادة</legend><div className="grid grid-cols-2 gap-2">{(["أساسية", "10%"] as const).map((item) => <button type="button" key={item} onClick={() => setDraft((current) => ({ ...current, materialType: item }))} className={`h-10 rounded-xl border text-sm font-black ${draft.materialType === item ? "border-sky-700 bg-sky-700 text-white" : "border-slate-200 bg-white text-slate-600"}`}>{item}</button>)}</div></fieldset>
      <fieldset><legend className="mb-2 text-sm font-black text-slate-700">أسابيع التنفيذ (1–18)</legend><div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{Array.from({ length: 18 }, (_, index) => index + 1).map((week) => <label key={week} className="flex min-h-10 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white text-xs font-black"><input type="checkbox" checked={draft.executionWeeks.includes(week)} onChange={() => toggleWeek(week)} />{week}</label>)}</div></fieldset>
      <label className="block text-sm font-black text-slate-700">عدد الحصص<input value={draft.periodCount} onChange={(event) => setDraft((current) => ({ ...current, periodCount: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold" /></label>
      <label className="block text-sm font-black text-slate-700 dark:text-slate-200">المعلمون<textarea value={draft.teacherNames.join("\n")} onChange={(event) => setTeacherNames(event.target.value)} rows={3} placeholder="اكتب اسم كل معلم في سطر مستقل" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-black text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200" role="alert">{error}</p> : null}
      <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => void save()} disabled={saving || !draft.domains.length || !draft.programs.length || !draft.executionWeeks.length} className="min-h-11 rounded-xl bg-amber-700 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50">{saving ? "جار الحفظ..." : "حفظ الصف"}</button><button type="button" onClick={onClose} disabled={saving || deleting} className="min-h-11 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">إلغاء</button></div>
      {row ? <button type="button" onClick={() => setConfirmDelete(true)} disabled={saving || deleting} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-50 text-sm font-black text-rose-700 dark:bg-rose-950/30 dark:text-rose-200"><Trash2 className="h-4 w-4" />حذف الصف</button> : null}
      <SmartActionModal open={confirmDelete} title="تأكيد حذف الصف" description="سيتم حذف هذا الصف من خطة 10% فقط." variant="danger" confirmLabel="حذف الصف" loading={deleting} portal onClose={() => setConfirmDelete(false)} onConfirm={() => void remove()} />
    </div>
  </SmartActionModal>;
}
