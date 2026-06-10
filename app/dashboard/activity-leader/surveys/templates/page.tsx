import { redirect } from "next/navigation";
import { SurveyTemplatesShell } from "@/components/surveys/survey-templates-shell";
import { requireActiveSubscriptionForCurrentUser } from "@/lib/subscription/subscription-guard";

export const dynamic = "force-dynamic";

export default async function ActivityLeaderSurveyTemplatesPage() {
  const current = await requireActiveSubscriptionForCurrentUser();

  if (current.user.role === "ADMIN") {
    redirect("/dashboard/admin/surveys/templates");
  }

  if (current.user.role !== "ACTIVITY_LEADER") {
    redirect("/dashboard/surveys/templates");
  }

  return <SurveyTemplatesShell ownerRole="ACTIVITY_LEADER" boardPath="/dashboard/activity-leader/surveys" />;
}