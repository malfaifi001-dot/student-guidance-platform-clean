"use client";

import { Loader2, Save } from "lucide-react";
import { useState } from "react";
import type { PortfolioWorkspaceData } from "@/lib/portfolio/portfolio-read-model";
import { getPortfolioTheme } from "@/lib/portfolio/portfolio-theme-registry";

export function PortfolioSettingsPanel({ data, busy, onSave }: {
  data: PortfolioWorkspaceData;
  busy: boolean;
  onSave: (body: unknown) => Promise<void>;
}) {
  const [form, setForm] = useState({
    title: data.portfolio.title,
    academicYear: data.portfolio.academicYear,
    term: data.portfolio.term,
    description: data.portfolio.description,
    themeId: getPortfolioTheme(data.portfolio.themeId).id,
    preferences: data.portfolio.preferences,
  });
  const field = (key: "title" | "academicYear" | "term" | "description", value: string) => setForm((old) => ({ ...old, [key]: value }));
  return (
    <form onSubmit={(event) => { event.preventDefault(); void onSave({ operation: "settings", ...form }); }} className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div><h2 className="text-xl font-black text-slate-950">إعدادات الملف</h2><p className="mt-1 text-sm font-bold text-slate-500">حدّث بيانات الملف وخيارات ظهوره في المعاينة.</p></div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-black text-slate-700">عنوان الملف<input required minLength={3} value={form.title} onChange={(e) => field("title", e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-500" /></label>
        <label className="text-sm font-black text-slate-700">العام الدراسي<input required value={form.academicYear} onChange={(e) => field("academicYear", e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-500" /></label>
        <label className="text-sm font-black text-slate-700">الفصل الدراسي<input required value={form.term} onChange={(e) => field("term", e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-500" /></label>
        <label className="text-sm font-black text-slate-700 md:col-span-2">وصف مختصر<textarea rows={3} maxLength={500} value={form.description} onChange={(e) => field("description", e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-500" /></label>
      </div>
      <button disabled={busy} className="inline-flex items-center gap-2 rounded-2xl bg-teal-700 px-5 py-3 text-sm font-black text-white disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}حفظ الإعدادات</button>
    </form>
  );
}
