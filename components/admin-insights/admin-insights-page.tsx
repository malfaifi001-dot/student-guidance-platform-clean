import Link from "next/link";
import { ArrowRight, BarChart3 } from "lucide-react";
import { getAdminInsightData } from "@/lib/admin-insights/admin-insights-service";
import type { AdminInsightMetric } from "@/lib/admin-insights/admin-insights-types";

export async function AdminInsightsPage({ metric }: { metric: AdminInsightMetric }) {
  const data = await getAdminInsightData(metric);
  return (
    <main className="space-y-5" dir="rtl">
      <header className="rounded-3xl border border-sky-100 bg-gradient-to-l from-slate-950 to-sky-950 p-6 text-white shadow-sm">
        <Link href="/dashboard/admin" className="inline-flex items-center gap-2 text-xs font-bold text-sky-200 hover:text-white"><ArrowRight className="h-4 w-4" />العودة إلى لوحة الإدارة</Link>
        <div className="mt-5 flex items-end justify-between gap-4">
          <div><p className="text-xs font-black text-sky-200">تحليلات الإدارة</p><h1 className="mt-2 text-3xl font-black">{data.title}</h1><p className="mt-2 text-sm font-bold text-slate-300">{data.description}</p></div>
          <BarChart3 className="hidden h-10 w-10 text-sky-200 sm:block" />
        </div>
        <p className="mt-6 text-4xl font-black">{data.total}</p>
      </header>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-lg font-black text-slate-950 dark:text-white">التفاصيل والترتيب</h2>
        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {data.rows.length ? data.rows.map((row) => <div key={`${row.label}-${row.value}`} className="flex items-center justify-between gap-4 py-3"><div><p className="font-black text-slate-800 dark:text-slate-100">{row.label}</p>{row.detail ? <p className="mt-1 text-xs font-bold text-slate-400">{row.detail}</p> : null}</div><span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-black text-sky-700 dark:bg-sky-950/50 dark:text-sky-200">{row.value}</span></div>) : <p className="py-8 text-center text-sm font-bold text-slate-400">لا توجد بيانات حاليًا.</p>}
        </div>
      </section>
    </main>
  );
}
