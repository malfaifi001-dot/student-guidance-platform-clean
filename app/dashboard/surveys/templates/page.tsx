import { redirect } from "next/navigation";
import { SurveyTemplatesShell } from "@/components/surveys/survey-templates-shell";
import { requireActiveSubscriptionForCurrentUser } from "@/lib/subscription/subscription-guard";

export const dynamic = "force-dynamic";

export default async function CounselorSurveyTemplatesPage() {
  const current = await requireActiveSubscriptionForCurrentUser();

  if (current.user.role === "ADMIN") {
    redirect("/dashboard/admin/surveys/templates");
  }

  if (current.user.role === "ACTIVITY_LEADER") {
    redirect("/dashboard/activity-leader/surveys/templates");
  }

  return <SurveyTemplatesShell ownerRole="COUNSELOR" boardPath="/dashboard/surveys" />;
}