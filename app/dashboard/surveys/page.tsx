import { redirect } from "next/navigation";
import { SurveyCenterShell } from "@/components/surveys/survey-center-shell";
import { requireActiveSubscriptionForCurrentUser } from "@/lib/subscription/subscription-guard";

export const dynamic = "force-dynamic";

export default async function CounselorSurveysPage() {
  const current = await requireActiveSubscriptionForCurrentUser();

  if (current.user.role === "ADMIN") {
    redirect("/dashboard/admin/surveys");
  }

  if (current.user.role === "ACTIVITY_LEADER") {
    redirect("/dashboard/activity-leader/surveys");
  }

  if (current.user.role === "TEACHER") {
    return <SurveyCenterShell ownerRole="TEACHER" boardPath="/dashboard/surveys" />;
  }

  return <SurveyCenterShell ownerRole="COUNSELOR" boardPath="/dashboard/surveys" />;
}
