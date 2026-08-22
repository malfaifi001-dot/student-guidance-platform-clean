import { redirect } from "next/navigation";
import { ActivityTeamShell } from "@/components/activity-team/activity-team-shell";
import { getDashboardHomePath } from "@/lib/auth/dashboard-redirects";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { requireServiceAccessForCurrentUser } from "@/lib/subscription/subscription-guard";
import { SCHOOL_ACTIVITY_TEAM_SERVICE } from "@/lib/activity-team/activity-team-config";

export default async function ActivityTeamPage() {
  const current = await requireDashboardUser();
  if (current.user.role !== "ACTIVITY_LEADER") redirect(getDashboardHomePath(current.user.role));
  await requireServiceAccessForCurrentUser(SCHOOL_ACTIVITY_TEAM_SERVICE.slug);
  if (!current.user.schoolAccountId) redirect("/dashboard/onboarding?required=true");
  const schoolAccount = current.user.schoolAccount;
  if (!schoolAccount) redirect("/dashboard/onboarding?required=true");

  return <ActivityTeamShell gender={current.user.gender} />;
}
