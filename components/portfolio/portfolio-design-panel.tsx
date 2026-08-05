"use client";

import { ExternalLink, Loader2, Palette, Save } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PortfolioThemePreviewCard } from "@/components/portfolio/portfolio-theme-preview-card";
import type { TeacherPortfolioWorkspace } from "@/lib/portfolio/portfolio-read-model";
import { DEFAULT_PORTFOLIO_THEME_ID, getPortfolioTheme } from "@/lib/portfolio/portfolio-theme-registry";

export function PortfolioDesignPanel({ data, busy, onSave }: {
  data: TeacherPortfolioWorkspace;
  busy: boolean;
  onSave: (body: unknown) => Promise<void>;
}) {
  const resolvedTheme = getPortfolioTheme(data.portfolio.themeId);
  const [preferences, setPreferences] = useState(data.portfolio.preferences);
  const payload = (nextPreferences = preferences) => ({
    operation: "settings",
    title: data.portfolio.title,
    academicYear: data.portfolio.academicYear,
    term: data.portfolio.term,
    description: data.portfolio.description,
    themeId: DEFAULT_PORTFOLIO_THEME_ID,
    preferences: nextPreferences,
  });
  const preferenceOptions = [
    ["showTableOfContents", "إظهار فهرس المحتويات"],
    ["showPerformanceDividers", "إظهار صفحات فواصل الأداء"],
    ["showCoverStatistics", "إظهار إحصاءات الغلاف"],
    ["showSchoolName", "إظهار اسم المدرسة"],
    ["showPrincipalName", "إظهار اسم مدير المدرسة"],
  ] as const;

  return <section className="space-y-6">
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-700"><Palette className="h-6 w-6" /></span><div><p className="text-xs font-black text-slate-400">ملف الإنجاز</p><h2 className="text-xl font-black text-slate-950">التصميم الحالي</h2><p className="mt-1 text-sm font-bold text-slate-500">التصميم الرسمي المعتمد لعرض الملف وطباعته.</p></div></div>
        <Link href={`/teacher/portfolio/print?portfolioId=${data.portfolio.id}`} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"><ExternalLink className="h-4 w-4" />معاينة التصميم</Link>
      </div>
      <div className="mt-6 max-w-xl"><PortfolioThemePreviewCard theme={resolvedTheme} /></div>
    </div>

    <form onSubmit={(event) => { event.preventDefault(); void onSave(payload()); }} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-black text-slate-950">خيارات العرض</h3><p className="mt-1 text-sm font-bold text-slate-500">تُطبّق هذه الخيارات على التصميم المحدد والمعاينة والطباعة.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">{preferenceOptions.map(([key, label]) => <label key={key} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700"><span>{label}</span><input type="checkbox" checked={preferences[key]} onChange={() => setPreferences((old) => ({ ...old, [key]: !old[key] }))} className="h-5 w-5 accent-teal-600" /></label>)}</div>
      <button disabled={busy} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-teal-700 px-5 py-3 text-sm font-black text-white disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}حفظ خيارات العرض</button>
    </form>
  </section>;
}
