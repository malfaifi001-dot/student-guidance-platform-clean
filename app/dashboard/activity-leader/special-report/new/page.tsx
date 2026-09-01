import { SpecialReportBuilder } from "@/components/special-report/special-report-builder";
import { ensureSpecialReportService } from "@/lib/special-report/runtime-builder";
import {
  requireActiveSubscriptionForCurrentUser,
  requireServiceAccessForCurrentUser,
} from "@/lib/subscription/subscription-guard";

export default async function NewActivityLeaderSpecialReportPage() {
  await ensureSpecialReportService();
  await requireActiveSubscriptionForCurrentUser();
  await requireServiceAccessForCurrentUser("special-report");

  return (
    <main className="space-y-6">
      <SpecialReportBuilder returnPath="/dashboard/activity-leader/special-report" />
    </main>
  );
}
