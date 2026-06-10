import { redirect } from "next/navigation";
import { SurveyAnalysisShell } from "@/components/surveys/survey-analysis-shell";
import { requireActiveSubscriptionForCurrentUser } from "@/lib/subscription/subscription-guard";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    surveyId: string;
  }>;
};

export default async function CounselorSurveyAnalysisPage({ params }: PageProps) {
  const current = await requireActiveSubscriptionForCurrentUser();
  const { surveyId } = await params;

  if (current.user.role === "ADMIN") {
    redirect(`/dashboard/admin/surveys/${surveyId}/analysis`);
  }

  if (current.user.role === "ACTIVITY_LEADER") {
    redirect(`/dashboard/activity-leader/surveys/${surveyId}/analysis`);
  }

  return <SurveyAnalysisShell surveyId={surveyId} boardPath="/dashboard/surveys" />;
}