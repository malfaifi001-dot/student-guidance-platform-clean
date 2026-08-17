import Link from "next/link";
import { FileText } from "lucide-react";

import type { PrincipalLinkedReport } from "@/lib/principal/performance-service";

export function PrincipalLinkedReportsPanel({ reports }: { reports: PrincipalLinkedReport[] }) {
  if (!reports.length) return null;

  return (
    <section className="rounded-[2rem] border border-emerald-100 bg-emerald-50/40 p-5 shadow-sm dark:border-emerald-950 dark:bg-emerald-950/20">
      <div className="mb-4">
        <p className="text-xs font-black text-emerald-700 dark:text-emerald-300">التقارير المستلمة</p>
        <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">تقارير مرتبطة بهذا العنصر</h2>
      </div>
      <div className="space-y-3">
        {reports.map((report) => (
          <article key={`${report.sourceType}:${report.id}`} className="grid gap-3 rounded-2xl border border-emerald-100 bg-white p-4 dark:border-emerald-900 dark:bg-slate-950 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div>
              <h3 className="text-base font-black text-slate-950 dark:text-white">{report.title}</h3>
              <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">منسوب المدرسة: {report.staffName} · {new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(new Date(report.issuedAt))}</p>
            </div>
            <Link href={report.previewHref} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-xs font-black text-white transition hover:bg-emerald-800">
              <FileText className="h-4 w-4" /> معاينة التقرير
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
