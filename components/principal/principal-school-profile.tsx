"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";

export type PrincipalSchoolProfileValue = {
  schoolName: string;
  principalName: string;
  schoolStatisticalNumber: string;
  educationDepartment: string;
  city: string;
  stage: string;
};

export function PrincipalSchoolProfile({ initialValue, isLinked }: { initialValue: PrincipalSchoolProfileValue; isLinked: boolean }) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  function setField(field: keyof PrincipalSchoolProfileValue, next: string) {
    setValue((current) => ({ ...current, [field]: next }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    const response = await fetch("/api/dashboard/principal/school-profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
    const body = await response.json().catch(() => null);
    setSaving(false);
    setFeedback({ tone: response.ok ? "success" : "error", text: body?.message || body?.error || (response.ok ? "تم الحفظ." : "تعذر الحفظ.") });
    if (response.ok && body?.created) window.location.href = "/dashboard/principal";
  }

  return <form dir="rtl" onSubmit={submit} className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-950"><div><h1 className="text-3xl font-black">بيانات المدرسة</h1><p className="mt-2 font-bold text-slate-500">{isLinked ? "تحديث الهوية المسموح بها للمدرسة المرتبطة بحسابك فقط." : "أدخل الهوية الرسمية للمدرسة لإنشائها وربطها بحسابك."}</p></div>{feedback ? <div className={`rounded-2xl p-4 text-sm font-black ${feedback.tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{feedback.text}</div> : null}<div className="grid gap-4 md:grid-cols-2"><Field label="اسم المدرسة" value={value.schoolName} onChange={(next) => setField("schoolName", next)} /><Field label="اسم مدير المدرسة" value={value.principalName} onChange={(next) => setField("principalName", next)} /><Field label="الرقم الإحصائي" value={value.schoolStatisticalNumber} onChange={(next) => setField("schoolStatisticalNumber", next)} inputMode="numeric" /><Field label="إدارة التعليم" value={value.educationDepartment} onChange={(next) => setField("educationDepartment", next)} /><Field label="المدينة" value={value.city} onChange={(next) => setField("city", next)} /><Field label="المرحلة" value={value.stage} onChange={(next) => setField("stage", next)} /></div><button disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-teal-700 px-6 py-3 text-sm font-black text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{isLinked ? "حفظ بيانات المدرسة" : "إنشاء وربط المدرسة"}</button></form>;
}

function Field({ label, value, onChange, inputMode }: { label: string; value: string; onChange: (value: string) => void; inputMode?: "numeric" }) {
  return <label className="space-y-2"><span className="block text-sm font-black text-slate-700 dark:text-slate-200">{label}</span><input required value={value} inputMode={inputMode} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-50 dark:border-slate-700 dark:bg-slate-900" /></label>;
}
