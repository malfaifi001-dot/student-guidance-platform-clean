"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DynamicFormRenderer } from "@/components/workflow/dynamic-form-renderer";
import type { RuntimeValues } from "@/engine/runtime/field-dependency-engine";
import type { RuntimeWorkflow } from "@/engine/runtime/runtime-resolver";
import { interpolateAccountabilityText } from "@/lib/accountability/accountability-text";

type Member = { id: string; name: string; role: string };
const ACCOUNTABILITY_META_KEYS = new Set(["accountability_category", "accountability_type", "official_text", "officialText", "statement_text", "official_statement"]);

function label(value: unknown) { return String(value || "").trim(); }
function fieldByKey(workflow: RuntimeWorkflow, keys: string[]) { const wanted = new Set(keys); return workflow.steps.flatMap((step) => step.fields).find((field) => wanted.has(field.key)); }

export function AccountabilityCreateForm({ workflow, serviceId, members }: { workflow: RuntimeWorkflow; serviceId: string; members: Member[] }) {
  const router = useRouter();
  const firstStep = useMemo(() => { const step = [...workflow.steps].sort((a, b) => a.order - b.order)[0]; return step ? { ...step, fields: [...step.fields].filter((field) => !ACCOUNTABILITY_META_KEYS.has(field.key)).sort((a, b) => a.order - b.order) } : null; }, [workflow]);
  const managerWorkflow = useMemo(() => ({ ...workflow, steps: firstStep ? [firstStep] : [] }), [firstStep, workflow]);
  const template = useMemo(() => String(fieldByKey(workflow, ["official_text", "officialText", "statement_text", "official_statement"])?.defaultValue || "").trim(), [workflow]);
  const [values, setValues] = useState<RuntimeValues>({});
  const [respondentUserId, setRespondentUserId] = useState("");
  const [officialText, setOfficialText] = useState(template);
  const [textTouched, setTextTouched] = useState(false);
  const selectedMember = members.find((member) => member.id === respondentUserId);
  const renderedText = textTouched ? officialText : interpolateAccountabilityText(template, values);
  const categoryField = fieldByKey(workflow, ["accountability_category"]);
  const typeField = fieldByKey(workflow, ["accountability_type"]);
  const category = label(values.accountability_category);
  const type = label(values.accountability_type);

  if (!firstStep) return <section className="rounded-[2rem] bg-amber-50 p-6 text-sm font-bold text-amber-900">لا يوجد Manager Workflow منشور لهذه الخدمة.</section>;

  return <div className="space-y-6" dir="rtl"><section className="rounded-[2.5rem] bg-gradient-to-br from-indigo-950 via-indigo-800 to-sky-600 p-6 text-white shadow-xl sm:p-8"><p className="text-xs font-black text-indigo-100">متابعة المعلمين</p><h1 className="mt-3 text-3xl font-black">إنشاء متابعة جديدة</h1><p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-indigo-50/90">اختر نوع المتابعة، عبئ البيانات، عدّل نص الإفادة، ثم احفظ المسودة.</p></section><section className="space-y-5"><section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"><h2 className="text-xl font-black text-slate-950 dark:text-white">بيانات المتابعة</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">{categoryField ? <SelectField field={categoryField} value={category} onChange={(value) => setValues((current) => ({ ...current, accountability_category: value, accountability_type: "" }))} /> : null}{typeField ? <SelectField field={typeField} value={type} onChange={(value) => setValues((current) => ({ ...current, accountability_type: value }))} filterValue={category} /> : null}<label className="block sm:col-span-2"><span className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200">المعلم/الموظف المستجيب</span><select required value={respondentUserId} onChange={(event) => setRespondentUserId(event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="">اختر من منسوبي المدرسة</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name} — {member.role}</option>)}</select></label></div></section><DynamicFormRenderer key={`${category}:${type}`} workflow={managerWorkflow} serviceId={serviceId} requiresStudent={false} title="متابعة المعلمين" initialValues={{ accountability_category: category, accountability_type: type }} onValuesChange={setValues} onSave={async (params) => { const response = await fetch("/api/dashboard/principal/accountability", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workflowId: workflow.id, serviceId, respondentUserId, respondentName: selectedMember?.name || "", categoryKey: label(params.values.accountability_category || category), typeKey: label(params.values.accountability_type || type), title: `${label(params.values.accountability_type || type) || "متابعة"} - ${selectedMember?.name || "منسوب المدرسة"}`, managerValues: params.values, officialTextSnapshot: textTouched ? officialText : renderedText }) }); const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error || "تعذر حفظ المسودة."); return { redirectTo: "/dashboard/principal/accountability", feedbackTitle: "تم حفظ المسودة", feedbackMessage: "يمكنك متابعة إعدادها من قائمة المتابعات." }; }} allowDraftSave submitLabel="حفظ المسودة" /><section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"><label className="block"><span className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200">نص الإفادة</span><textarea value={textTouched ? officialText : renderedText} onChange={(event) => { setTextTouched(true); setOfficialText(event.target.value); }} rows={8} className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-8 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label></section></section></div>;
}

function SelectField({ field, value, onChange, filterValue }: { field: RuntimeWorkflow["steps"][number]["fields"][number]; value: string; onChange: (value: string) => void; filterValue?: string }) { const options = field.options.filter((option) => !filterValue || !option.linkedToValue || option.linkedToValue === filterValue); return <label className="block"><span className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200">{field.label}</span><select required={field.isRequired} value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="">اختر...</option>{options.map((option) => <option key={option.id} value={option.value}>{option.label}</option>)}</select></label>; }
