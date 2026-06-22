import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { listReportTwoSnapshots } from "@/lib/report-2/report-snapshot-service";
import { ReportTwoArchiveClient } from "@/components/report-2/report-two-archive-client";

export async function ReportTwoHome() {
  const context = await requireDashboardPageContext();
  const snapshots = await listReportTwoSnapshots(context);

  return (
    <main className="px-6 py-8" dir="rtl">
      <section className="mx-auto max-w-6xl">
        <ReportTwoArchiveClient snapshots={snapshots} />
      </section>
    </main>
  );
}
