import { redirect } from "next/navigation";
import { SurveyResponsesShell } from "@/components/surveys/survey-responses-shell";
import { requireActiveSubscriptionForCurrentUser } from "@/lib/subscription/subscription-guard";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    surveyId: string;
  }>;
};

export default async function CounselorSurveyResponsesPage({ params }: PageProps) {
  const current = await requireActiveSubscriptionForCurrentUser();
  const { surveyId } = await params;

  if (current.user.role === "ADMIN") {
    redirect(`/dashboard/admin/surveys/${surveyId}/responses`);
  }

  if (current.user.role === "ACTIVITY_LEADER") {
    redirect(`/dashboard/activity-leader/surveys/${surveyId}/responses`);
  }

  return <SurveyResponsesShell surveyId={surveyId} boardPath="/dashboard/surveys" />;
}