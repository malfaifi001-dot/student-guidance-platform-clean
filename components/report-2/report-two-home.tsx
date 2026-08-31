import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { listReportTwoSnapshots } from "@/lib/report-2/report-snapshot-service";
import { ReportTwoArchiveClient } from "@/components/report-2/report-two-archive-client";
import { roleHasReportTwoCapability } from "@/lib/report-2/report-two-access";

export async function ReportTwoHome() {
  const context = await requireDashboardPageContext({ allowPrincipal: true });
  const snapshots = await listReportTwoSnapshots(context);

  return (
    <main className="space-y-5" dir="rtl">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-sky-900 to-sky-600 p-8 text-white shadow-xl">
        <h1 className="text-4xl font-black">التقارير</h1>
      </section>

      <ReportTwoArchiveClient
        snapshots={snapshots}
        readOnly={!roleHasReportTwoCapability(context.user.role, "REPORT_DELETE")}
      />
    </main>
  );
}
