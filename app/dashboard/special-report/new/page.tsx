import { SpecialReportBuilder } from "@/components/special-report/special-report-builder";
import { ensureSpecialReportService } from "@/lib/special-report/runtime-builder";
import {
  requireActiveSubscriptionForCurrentUser,
  requireServiceAccessForCurrentUser,
} from "@/lib/subscription/subscription-guard";

export default async function NewSpecialReportPage() {
  await ensureSpecialReportService();
  const current = await requireActiveSubscriptionForCurrentUser();
  await requireServiceAccessForCurrentUser("special-report");
  const returnPath =
    current.user.role === "ACTIVITY_LEADER"
      ? "/dashboard/activity-leader/special-report"
      : "/dashboard/teacher/special-report";

  return (
    <main className="space-y-6">
      <SpecialReportBuilder returnPath={returnPath} />
    </main>
  );
}
