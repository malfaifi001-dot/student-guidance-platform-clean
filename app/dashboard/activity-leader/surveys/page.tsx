import { redirect } from "next/navigation";
import { SurveyCenterShell } from "@/components/surveys/survey-center-shell";
import { requireActiveSubscriptionForCurrentUser } from "@/lib/subscription/subscription-guard";

export const dynamic = "force-dynamic";

export default async function ActivityLeaderSurveysPage() {
  const current = await requireActiveSubscriptionForCurrentUser();

  if (current.user.role === "ADMIN") {
    redirect("/dashboard/admin/surveys");
  }

  if (current.user.role !== "ACTIVITY_LEADER") {
    redirect("/dashboard/surveys");
  }

  return <SurveyCenterShell ownerRole="ACTIVITY_LEADER" boardPath="/dashboard/activity-leader/surveys" />;
}