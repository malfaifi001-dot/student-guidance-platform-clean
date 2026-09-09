"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { SmartActionModal } from "@/components/ui/smart-action-modal";
import { ACTIVITY_PLAN_SECTIONS } from "@/lib/activity-plan/activity-plan-stages";
import { getTenPercentGradeOptions } from "@/lib/activity-plan/ten-percent-activity-plan-types";
import type { SemesterCopyStrategy } from "@/lib/activity-plan/activity-plan-copy-service";

type Destination = { stage: string; grade: string; section: string };

type Props = {
  open: boolean;
  allowedStages: string[];
  currentStage: string;
  currentGrade: string;
  currentSection: string;
  onClose: () => void;
  onCopied: () => void;
};

const SECTION_LABELS = ["أ", "ب", "ج", "د", "هـ", "و", "ز"] as const;

function sectionLabel(section: string) {
  const index = ACTIVITY_PLAN_SECTIONS.indexOf(section as (typeof ACTIVITY_PLAN_SECTIONS)[number]);
  return index >= 0 ? SECTION_LABELS[index] : section;
}

function contextLabel(value: Destination) {
  return `${value.stage} — ${value.grade} ${sectionLabel(value.section)}`;
}

export function SemesterActivityPlanCopyModal({ open, allowedStages, currentStage, currentGrade, currentSection, onClose, onCopied }: Props) {
  const [sourceStage, setSourceStage] = useState(currentStage);
  const [sourceGrade, setSourceGrade] = useState(currentGrade);
  const [sourceSection, setSourceSection] = useState(currentSection || ACTIVITY_PLAN_SECTIONS[0]);
  const [destinationStage, setDestinationStage] = useState(currentStage);
  const [destinationGrades, setDestinationGrades] = useState<string[]>(currentGrade ? [currentGrade] : []);
  const [destinationSections, setDestinationSections] = useState<string[]>(currentSection ? [currentSection] : [ACTIVITY_PLAN_SECTIONS[0]]);
  const [strategy, setStrategy] = useState<Exclude<SemesterCopyStrategy, "check">>("empty-only");
  const [saving, setSaving] = useState(false);
  const [confirmRequired, setConfirmRequired] = useState(false);
  const [allDestinationConfirmation, setAllDestinationConfirmation] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [conflictCount, setConflictCount] = useState(0);

  const sourceGradeOptions = useMemo(() => getTenPercentGradeOptions(sourceStage), [sourceStage]);
  const destinationGradeOptions = useMemo(() => getTenPercentGradeOptions(destinationStage), [destinationStage]);
  const destinations = useMemo<Destination[]>(() => destinationGrades.flatMap((grade) => destinationSections.map((section) => ({ stage: destinationStage, grade, section }))), [destinationGrades, destinationSections, destinationStage]);
  const allDestinationsSelected = destinationGrades.length === destinationGradeOptions.length && destinationSections.length === ACTIVITY_PLAN_SECTIONS.length;

  useEffect(() => {
    if (!open) return;
    const initialStage = allowedStages.includes(currentStage) ? currentStage : allowedStages[0] || "";
    const initialGrades = getTenPercentGradeOptions(initialStage);
    const initialGrade = initialGrades.includes(currentGrade) ? currentGrade : initialGrades[0] || "";
    const initialSection = ACTIVITY_PLAN_SECTIONS.includes(currentSection as (typeof ACTIVITY_PLAN_SECTIONS)[number]) ? currentSection : ACTIVITY_PLAN_SECTIONS[0];
    setSourceStage(initialStage);
    setSourceGrade(initialGrade);
    setSourceSection(initialSection);
    setDestinationStage(initialStage);
    setDestinationGrades(initialGrade ? [initialGrade] : []);
    setDestinationSections([initialSection]);
    setStrategy("empty-only");
    setConfirmRequired(false);
    setAllDestinationConfirmation(false);
    setConflictCount(0);
    setError("");
    setSuccess("");
  }, [open, allowedStages, currentStage, currentGrade, currentSection]);

  const resetFlow = () => {
    setConfirmRequired(false);
    setAllDestinationConfirmation(false);
    setConflictCount(0);
    setError("");
    setSuccess("");
  };

  const toggleValue = (value: string, values: string[], setValues: (next: string[]) => void) => {
    setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
    resetFlow();
  };

  const selectSourceStage = (next: string) => {
    const nextGrades = getTenPercentGradeOptions(next);
    setSourceStage(next);
    setSourceGrade(nextGrades[0] || "");
    resetFlow();
  };

  const selectDestinationStage = (next: string) => {
    setDestinationStage(next);
    setDestinationGrades([]);
    resetFlow();
  };

  const selectAllGrades = () => { setDestinationGrades(destinationGradeOptions); resetFlow(); };
  const selectAllSections = () => { setDestinationSections([...ACTIVITY_PLAN_SECTIONS]); resetFlow(); };

  const postCopy = async (nextStrategy: Exclude<SemesterCopyStrategy, "check">) => {
    const response = await fetch("/api/dashboard/activity-plan/copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "ten-percent", source: { stage: sourceStage, grade: sourceGrade, section: sourceSection }, destinations, strategy: nextStrategy }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(payload.error || "تعذر نسخ الخطة الفصلية."), { payload, status: response.status });
    setSuccess(`المصدر: ${contextLabel({ stage: sourceStage, grade: sourceGrade, section: sourceSection })} · الوجهات: ${destinations.length} · تم النسخ: ${payload.copiedDestinationCount || 0} · تم التخطي: ${payload.skippedDestinations?.length || 0} · تم الاستبدال: ${payload.replacedDestinations?.length || 0}`);
    setConfirmRequired(false);
    setConflictCount(0);
    onCopied();
  };

  const copy = async () => {
    if (!sourceStage || !sourceGrade || !sourceSection || !destinations.length) { setError("أكمل المصدر وحدد وجهة واحدة على الأقل."); return; }
    if (allDestinationsSelected && !allDestinationConfirmation) { setAllDestinationConfirmation(true); return; }
    setSaving(true);
    setError("");
    try {
      if (!confirmRequired) {
        const response = await fetch("/api/dashboard/activity-plan/copy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "ten-percent", source: { stage: sourceStage, grade: sourceGrade, section: sourceSection }, destinations, strategy: "check" }),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.status === 409 && payload.requiresConfirmation) {
          setConfirmRequired(true);
          setConflictCount(Number(payload.existingDestinations?.length || 0));
          setError(payload.error || `يوجد محتوى محفوظ في ${payload.existingDestinations?.length || 0} وجهات.`);
          return;
        }
        if (!response.ok) throw new Error(payload.error || "تعذر التحقق من الوجهات.");
      }
      await postCopy(strategy);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر نسخ الخطة الفصلية.");
    } finally {
      setSaving(false);
    }
  };

  return <SmartActionModal open={open} title="نسخ الخطة" description="انسخ نشاط المصدر إلى وجهات محددة مع الحفاظ على بيانات المصدر." portal onClose={onClose} showFooter={false}>
    <div className="max-h-[76vh] space-y-3 overflow-y-auto pr-1" dir="rtl">
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <h3 className="mb-2 text-sm font-black text-slate-800">المصدر</h3>
        <div className="grid gap-2 sm:grid-cols-3">
          <select value={sourceStage} onChange={(event) => selectSourceStage(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold"><option value="">المرحلة</option>{allowedStages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select>
          <select value={sourceGrade} onChange={(event) => { setSourceGrade(event.target.value); resetFlow(); }} className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold"><option value="">الصف</option>{sourceGradeOptions.map((grade) => <option key={grade} value={grade}>{grade}</option>)}</select>
          <select value={sourceSection} onChange={(event) => { setSourceSection(event.target.value); resetFlow(); }} className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold"><option value="">الفصل</option>{ACTIVITY_PLAN_SECTIONS.map((section) => <option key={section} value={section}>{sectionLabel(section)}</option>)}</select>
        </div>
        <p className="mt-2 text-xs font-black text-slate-600">{sourceStage && sourceGrade && sourceSection ? contextLabel({ stage: sourceStage, grade: sourceGrade, section: sourceSection }) : "حدد مصدر النسخ"}</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <h3 className="mb-2 text-sm font-black text-slate-800">الوجهة</h3>
        <select value={destinationStage} onChange={(event) => selectDestinationStage(event.target.value)} className="mb-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold"><option value="">المرحلة</option>{allowedStages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select>
        <div className="mb-2 flex items-center justify-between gap-2"><span className="text-xs font-black text-slate-600">الصفوف</span><button type="button" onClick={selectAllGrades} className="text-[11px] font-black text-sky-700">تحديد الكل</button></div>
        <div className="flex flex-wrap gap-1.5">{destinationGradeOptions.map((grade) => <button type="button" key={grade} aria-pressed={destinationGrades.includes(grade)} onClick={() => toggleValue(grade, destinationGrades, setDestinationGrades)} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-black ${destinationGrades.includes(grade) ? "bg-sky-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>{grade}</button>)}</div>
        <div className="mb-2 mt-3 flex items-center justify-between gap-2"><span className="text-xs font-black text-slate-600">الفصول</span><button type="button" onClick={selectAllSections} className="text-[11px] font-black text-sky-700">تحديد الكل</button></div>
        <div className="flex flex-wrap gap-1.5">{ACTIVITY_PLAN_SECTIONS.map((section) => <button type="button" key={section} aria-pressed={destinationSections.includes(section)} onClick={() => toggleValue(section, destinationSections, setDestinationSections)} className={`h-8 min-w-8 rounded-lg px-2 text-xs font-black ${destinationSections.includes(section) ? "bg-sky-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>{sectionLabel(section)}</button>)}</div>
        <p className="mt-2 text-[11px] font-bold text-slate-500">عدد الوجهات المحددة: {destinations.length}</p>
      </section>

      <fieldset><legend className="mb-2 text-sm font-black text-slate-800">طريقة النسخ</legend><div className="grid grid-cols-3 gap-1.5">{([ ["empty-only", "للفارغة فقط"], ["skip", "تخطي الموجود"], ["replace", "استبدال الموجود"] ] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={strategy === value} onClick={() => { setStrategy(value); setError(""); }} className={`min-h-10 rounded-lg border px-1 text-[11px] font-black ${strategy === value ? "border-sky-700 bg-sky-700 text-white" : "border-slate-200 bg-white text-slate-600"}`}>{label}</button>)}</div></fieldset>
      {allDestinationConfirmation ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800">تم تحديد جميع الصفوف والفصول في المرحلة. اضغط تنفيذ النسخ للتأكيد.</p> : null}
      {conflictCount ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800">يوجد محتوى محفوظ في {conflictCount} وجهات.</p> : null}
      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700" role="alert">{error}</p> : null}
      {success ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700" role="status">{success}</p> : null}
      <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => void copy()} disabled={saving || !destinations.length} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg bg-sky-700 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50"><Copy className="h-4 w-4" />{saving ? "جار النسخ..." : "تنفيذ النسخ"}</button><button type="button" onClick={onClose} disabled={saving} className="min-h-10 rounded-lg border border-slate-200 bg-white text-xs font-black text-slate-600">إلغاء</button></div>
    </div>
  </SmartActionModal>;
}
