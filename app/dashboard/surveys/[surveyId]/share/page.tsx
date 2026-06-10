import { redirect } from "next/navigation";
import { SurveyShareShell } from "@/components/surveys/survey-share-shell";
import { requireActiveSubscriptionForCurrentUser } from "@/lib/subscription/subscription-guard";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    surveyId: string;
  }>;
};

export default async function CounselorSurveySharePage({ params }: PageProps) {
  const current = await requireActiveSubscriptionForCurrentUser();
  const { surveyId } = await params;

  if (current.user.role === "ADMIN") {
    redirect(`/dashboard/admin/surveys/${surveyId}/share`);
  }

  if (current.user.role === "ACTIVITY_LEADER") {
    redirect(`/dashboard/activity-leader/surveys/${surveyId}/share`);
  }

  return <SurveyShareShell surveyId={surveyId} boardPath="/dashboard/surveys" />;
}