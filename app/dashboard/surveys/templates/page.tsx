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

  if (current.user.role === "TEACHER") {
    return <SurveyTemplatesShell ownerRole="TEACHER" boardPath="/dashboard/surveys" />;
  }

  if (current.user.role === "PRINCIPAL") {
    return <SurveyTemplatesShell ownerRole="PRINCIPAL" boardPath="/dashboard/surveys" />;
  }

  return <SurveyTemplatesShell ownerRole="COUNSELOR" boardPath="/dashboard/surveys" />;
}
