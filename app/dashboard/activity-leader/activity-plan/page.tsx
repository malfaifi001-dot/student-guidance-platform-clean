import { redirect } from "next/navigation";
import { ActivityPlanShell } from "@/components/activity-plan/activity-plan-shell";
import { getDashboardHomePath } from "@/lib/auth/dashboard-redirects";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { requireServiceAccessForCurrentUser } from "@/lib/subscription/subscription-guard";

export default async function ActivityPlanPage() {
  const current = await requireDashboardUser();
  if (current.user.role !== "ACTIVITY_LEADER") redirect(getDashboardHomePath(current.user.role));
  await requireServiceAccessForCurrentUser("student-activity-plan");
  if (!current.user.schoolAccountId) redirect("/dashboard/onboarding?required=true");
  return <ActivityPlanShell />;
}
