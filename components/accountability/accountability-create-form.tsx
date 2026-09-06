"use client";

import { useMemo, useState } from "react";
import { DynamicFieldRenderer } from "@/components/workflow/dynamic-field-renderer";
import { AccountabilityA4Card } from "@/components/accountability/accountability-a4-card";
import { isConditionalWorkflowFieldVisible } from "@/engine/runtime/workflow-conditional-logic";
import type { RuntimeWorkflow } from "@/engine/runtime/runtime-resolver";

type Member = { id: string; name: string; role: string };
const legacyTextKeys = new Set(["official_text", "officialText", "statement_text", "official_statement"]);

export function AccountabilityCreateForm({ workflow, serviceId, members, schoolName }: { workflow: RuntimeWorkflow; serviceId: string; members: Member[]; schoolName?: string | null }) {
  const firstStep = useMemo(() => [...workflow.steps].sort((a, b) => a.order - b.order)[0] || null, [workflow]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [officialText, setOfficialText] = useState("");
  const [respondentUserId, setRespondentUserId] = useState("");
  const [method, setMethod] = useState<"SYSTEM" | "WHATSAPP">("SYSTEM");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [generated, setGenerated] = useState(false);
  const selectedMember = members.find((member) => member.id === respondentUserId);
  const visibleFields = (firstStep?.fields || []).filter((field) => !legacyTextKeys.has(field.key) && isConditionalWorkflowFieldVisible(field, values));
  const categoryField = firstStep?.fields.find((field) => field.key === "accountability_category");
  const typeField = firstStep?.fields.find((field) => field.key === "accountability_type");
  const typeLabel = typeField?.options.find((option) => option.value === values.accountability_type)?.label || String(values.accountability_type || "");

  if (!firstStep) return <section className="rounded-2xl bg-amber-50 p-6 text-sm font-bold text-amber-900">لا توجد خطوة أولى منشورة في Workflow.</section>;

  async function generate() {
    setBusy(true); setMessage("");
    try { const response = await fetch("/api/dashboard/principal/accountability/generate-text", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workflowId: workflow.id, serviceId, accountabilityType: values.accountability_type, values }) }); const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error || "تعذر توليد النص."); setOfficialText(result.officialText); setGenerated(true); } catch (error) { setMessage(error instanceof Error ? error.message : "تعذر توليد النص."); } finally { setBusy(false); }
  }

  async function save(shouldSend: boolean) {
    if (!officialText.trim()) { setMessage("يرجى صياغة نص المساءلة أولًا."); return; }
    if (!respondentUserId) { setMessage("يرجى اختيار المعلم أو المنسوب."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/dashboard/principal/accountability", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workflowId: workflow.id, serviceId, respondentUserId, categoryKey: String(values.accountability_category || ""), typeKey: String(values.accountability_type || ""), title: `${typeLabel || "متابعة"} - ${selectedMember?.name || "منسوب المدرسة"}`, managerValues: values, officialText }) });
      const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error || "تعذر حفظ المسودة.");
      if (shouldSend) { const sendResponse = await fetch(`/api/dashboard/principal/accountability/${result.request.id}/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deliveryMethod: method }) }); const sent = await sendResponse.json(); if (!sendResponse.ok || !sent.success) throw new Error(sent.error || "تعذر الإرسال."); if (sent.whatsappUrl) window.open(sent.whatsappUrl, "_blank", "noopener,noreferrer"); }
      window.location.href = "/dashboard/principal/accountability";
    } catch (error) { setMessage(error instanceof Error ? error.message : "تعذر حفظ الطلب."); setBusy(false); }
  }

  return <div className="space-y-6" dir="rtl"><section className="rounded-[2rem] bg-gradient-to-br from-indigo-950 via-indigo-800 to-sky-600 p-6 text-white shadow-xl"><p className="text-xs font-black text-indigo-100">متابعة المعلمين</p><h1 className="mt-3 text-3xl font-black">إنشاء متابعة جديدة</h1><p className="mt-3 text-sm font-bold leading-7 text-indigo-50">اختر النوع، أدخل بيانات الواقعة، ثم راجع وثيقة المساءلة قبل إرسالها.</p></section>
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black">1. اختر نوع المساءلة</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">{categoryField ? <DynamicFieldRenderer field={categoryField} workflow={workflow} value={values[categoryField.key]} values={values} onChange={(key, value) => setValues((current) => ({ ...current, [key]: value, accountability_type: "" }))} /> : null}{typeField ? <DynamicFieldRenderer field={typeField} workflow={workflow} value={values[typeField.key]} values={values} onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))} /> : null}</div></section>
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black">2. بيانات الواقعة</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">{visibleFields.filter((field) => field.key !== "accountability_category" && field.key !== "accountability_type").map((field) => <DynamicFieldRenderer key={field.id} field={field} workflow={workflow} value={values[field.key]} values={values} onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))} />)}</div><button type="button" disabled={busy || !values.accountability_type} onClick={() => void generate()} className="mt-5 min-h-12 rounded-2xl bg-indigo-700 px-6 text-sm font-black text-white disabled:opacity-50">{busy ? "جارٍ المعالجة..." : "3. صياغة نص المساءلة"}</button></section>
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black">4. راجع النص</h2><textarea value={officialText} onChange={(event) => { setOfficialText(event.target.value); setGenerated(true); }} rows={6} placeholder="سيظهر النص الرسمي بعد الصياغة" className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-8 outline-none focus:border-indigo-500" /></section>
    <section><h2 className="mb-3 text-xl font-black">5. شاهد وثيقة A4</h2><AccountabilityA4Card mode="PRE_SEND" schoolName={schoolName} title={`${typeLabel || "متابعة"} - ${selectedMember?.name || "منسوب المدرسة"}`} typeLabel={typeLabel} respondentName={selectedMember?.name || "غير محدد"} officialText={officialText} managerStep={firstStep} managerValues={values} status="DRAFT" /></section>
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black">6. اختر المنسوب وطريقة الإرسال</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-sm font-black">المعلم / المنسوب</span><select value={respondentUserId} onChange={(event) => setRespondentUserId(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold"><option value="">اختر من منسوبي المدرسة</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name} — {member.role}</option>)}</select></label><label className="block"><span className="mb-2 block text-sm font-black">طريقة الإرسال</span><select value={method} onChange={(event) => setMethod(event.target.value as "SYSTEM" | "WHATSAPP")} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold"><option value="SYSTEM">داخل النظام</option><option value="WHATSAPP">واتساب</option></select></label></div><div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={busy || !generated} onClick={() => void save(false)} className="min-h-12 rounded-2xl border border-slate-300 bg-white px-6 text-sm font-black">حفظ كمسودة</button><button type="button" disabled={busy || !generated} onClick={() => void save(true)} className="min-h-12 rounded-2xl bg-indigo-700 px-6 text-sm font-black text-white disabled:opacity-50">7. إرسال</button></div>{message ? <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{message}</p> : null}</section>
  </div>;
}
