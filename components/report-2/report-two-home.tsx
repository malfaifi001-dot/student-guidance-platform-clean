import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { listReportTwoSnapshots } from "@/lib/report-2/report-snapshot-service";
import { ReportTwoArchiveClient } from "@/components/report-2/report-two-archive-client";

export async function ReportTwoHome() {
  const context = await requireDashboardPageContext();
  const snapshots = await listReportTwoSnapshots(context);

  return (
    <main className="px-6 py-10" dir="rtl">
      <section className="mx-auto max-w-6xl space-y-5">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">report-2</p>

          <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
            التقارير المعتمدة
          </h1>

          <p className="mt-3 text-sm font-bold leading-7 text-slate-500 dark:text-slate-400">
            أرشيف ثابت للتقارير التي تم اعتمادها من مسار report-2. تعرض هذه
            الصفحة النسخ المعتمدة فقط.
          </p>
        </div>

        <ReportTwoArchiveClient snapshots={snapshots} />
      </section>
    </main>
  );
}
