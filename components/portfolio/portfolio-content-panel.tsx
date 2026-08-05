"use client";

import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import type { TeacherPortfolioWorkspace } from "@/lib/portfolio/portfolio-read-model";
import { portfolioEducationIdentitySchema, type PortfolioEducationIdentity } from "@/lib/portfolio/portfolio-types";

type ListKey = "pillars" | "values" | "strategicObjectives";

const biographyLabels: Array<[keyof TeacherPortfolioWorkspace["biography"], string]> = [
  ["professionalSummary", "الملخص المهني"],
  ["specialization", "التخصص"],
  ["academicQualification", "المؤهل العلمي"],
  ["yearsOfExperience", "سنوات الخبرة"],
  ["skills", "المهارات"],
  ["professionalInterests", "الاهتمامات المهنية"],
];

function RepeatableList({
  title,
  helper,
  items,
  maximum,
  disabled,
  onChange,
}: {
  title: string;
  helper: string;
  items: string[];
  maximum: number;
  disabled: boolean;
  onChange: (items: string[]) => void;
}) {
  const update = (index: number, value: string) => onChange(items.map((item, itemIndex) => itemIndex === index ? value : item));
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return <fieldset disabled={disabled} className="space-y-3 rounded-2xl border border-slate-200 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><legend className="text-sm font-black text-slate-800">{title}</legend><p className="mt-1 text-xs font-bold leading-5 text-slate-500">{helper}</p></div>
      <button type="button" disabled={items.length >= maximum} onClick={() => onChange([...items, ""])} className="inline-flex items-center gap-1.5 rounded-xl bg-teal-50 px-3 py-2 text-xs font-black text-teal-800 disabled:cursor-not-allowed disabled:opacity-50"><Plus className="h-4 w-4" />إضافة</button>
    </div>
    {items.length ? <div className="space-y-2">{items.map((item, index) => <div key={`${title}-${index}`} className="flex items-center gap-2">
      <span className="w-6 shrink-0 text-center text-xs font-black text-slate-400">{index + 1}</span>
      <input value={item} onChange={(event) => update(index, event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-teal-500" aria-label={`${title} ${index + 1}`} />
      <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`نقل ${title} إلى أعلى`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
      <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label={`نقل ${title} إلى أسفل`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
      <button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`حذف ${title}`} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
    </div>)}</div> : <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500">لا توجد عناصر. يمكنك إضافة أول عنصر.</p>}
  </fieldset>;
}

export function PortfolioContentPanel({ data, busy, onSave }: { data: TeacherPortfolioWorkspace; busy: boolean; onSave: (body: unknown) => Promise<void> }) {
  const [introText, setIntroText] = useState(data.portfolio.introText);
  const [conclusionText, setConclusionText] = useState(data.portfolio.conclusionText);
  const [biography, setBiography] = useState(data.biography);
  const [educationIdentity, setEducationIdentity] = useState<PortfolioEducationIdentity>(() => ({
    ...data.educationIdentity,
    pillars: [...data.educationIdentity.pillars],
    values: [...data.educationIdentity.values],
    strategicObjectives: [...data.educationIdentity.strategicObjectives],
  }));
  const [validationError, setValidationError] = useState("");
  const [saving, setSaving] = useState(false);
  const submittingRef = useRef(false);
  const disabled = busy || saving;
  const biographyField = (key: keyof typeof biography, value: string) => setBiography((current) => ({ ...current, [key]: value }));
  const identityText = (key: "vision" | "mission", value: string) => setEducationIdentity((current) => ({ ...current, [key]: value }));
  const identityList = (key: ListKey, items: string[]) => setEducationIdentity((current) => ({ ...current, [key]: items }));

  async function submit() {
    if (submittingRef.current || busy) return;
    const parsed = portfolioEducationIdentitySchema.safeParse(educationIdentity);
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message || "تحقق من بيانات الهوية التعليمية.");
      return;
    }
    submittingRef.current = true;
    setSaving(true);
    setValidationError("");
    try {
      await onSave({ operation: "content", introText, conclusionText, biography, educationIdentity: parsed.data });
    } catch {
      // The workspace presents API errors through PortfolioFeedbackPopCard.
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  }

  return <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
    <div><h2 className="text-xl font-black text-slate-950">المحتوى التعريفي</h2><p className="mt-1 text-sm font-bold text-slate-500">الاسم والمسمى والمدرسة تُقرأ تلقائيًا من الملف الشخصي.</p></div>

    <section className="space-y-3"><div><h3 className="text-base font-black text-slate-900">المقدمة</h3><p className="mt-1 text-xs font-bold text-slate-500">النص الافتتاحي الذي يسبق الهوية التعليمية.</p></div><textarea rows={5} value={introText} disabled={disabled} onChange={(event) => setIntroText(event.target.value)} className="w-full rounded-2xl border border-slate-200 p-4 outline-none focus:border-teal-500 disabled:bg-slate-50" /></section>

    <section className="space-y-4 border-y border-slate-200 py-6">
      <div><h3 className="text-lg font-black text-slate-950">الهوية التعليمية</h3><p className="mt-1 text-sm font-bold text-slate-500">حرّر الرؤية والرسالة والقوائم، وسيظهر ترتيبها نفسه في صفحات المقدمة.</p></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="text-sm font-black text-slate-700">الرؤية<textarea rows={5} maxLength={1000} value={educationIdentity.vision} disabled={disabled} onChange={(event) => identityText("vision", event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 p-4 font-bold leading-7 outline-none focus:border-teal-500 disabled:bg-slate-50" /><span className="mt-1 block text-left text-[11px] font-bold text-slate-400">{educationIdentity.vision.length}/1000</span></label>
        <label className="text-sm font-black text-slate-700">الرسالة<textarea rows={5} maxLength={1200} value={educationIdentity.mission} disabled={disabled} onChange={(event) => identityText("mission", event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 p-4 font-bold leading-7 outline-none focus:border-teal-500 disabled:bg-slate-50" /><span className="mt-1 block text-left text-[11px] font-bold text-slate-400">{educationIdentity.mission.length}/1200</span></label>
      </div>
      <RepeatableList title="المحاور" helper="حتى 10 محاور، بحد أقصى 120 حرفًا لكل محور." items={educationIdentity.pillars} maximum={10} disabled={disabled} onChange={(items) => identityList("pillars", items)} />
      <RepeatableList title="القيم" helper="حتى 12 قيمة، بحد أقصى 100 حرف لكل قيمة." items={educationIdentity.values} maximum={12} disabled={disabled} onChange={(items) => identityList("values", items)} />
      <RepeatableList title="الأهداف الاستراتيجية" helper="حتى 20 هدفًا، بحد أقصى 220 حرفًا لكل هدف." items={educationIdentity.strategicObjectives} maximum={20} disabled={disabled} onChange={(items) => identityList("strategicObjectives", items)} />
      {validationError ? <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">{validationError}</p> : null}
    </section>

    <section className="space-y-4"><div><h3 className="text-base font-black text-slate-900">السيرة المهنية</h3><p className="mt-1 text-xs font-bold text-slate-500">معلومات مهنية مكملة لبيانات الحساب والمدرسة.</p></div><div className="grid gap-4 md:grid-cols-2">{biographyLabels.map(([key, label]) => <label key={key} className={`text-sm font-black text-slate-700 ${key === "professionalSummary" ? "md:col-span-2" : ""}`}>{label}<textarea rows={key === "professionalSummary" ? 4 : 2} value={biography[key]} disabled={disabled} onChange={(event) => biographyField(key, event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 p-4 outline-none focus:border-teal-500 disabled:bg-slate-50" /></label>)}</div></section>
    <section className="space-y-3"><h3 className="text-base font-black text-slate-900">الخاتمة</h3><textarea rows={5} value={conclusionText} disabled={disabled} onChange={(event) => setConclusionText(event.target.value)} className="w-full rounded-2xl border border-slate-200 p-4 outline-none focus:border-teal-500 disabled:bg-slate-50" /></section>
    <button type="submit" disabled={disabled} className="inline-flex items-center gap-2 rounded-2xl bg-teal-700 px-5 py-3 text-sm font-black text-white disabled:opacity-60">{disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}حفظ المحتوى</button>
  </form>;
}
