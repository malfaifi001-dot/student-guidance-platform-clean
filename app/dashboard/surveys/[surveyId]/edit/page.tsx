import { redirect } from "next/navigation";
import { SurveyEditShell } from "@/components/surveys/survey-edit-shell";
import { requireActiveSubscriptionForCurrentUser } from "@/lib/subscription/subscription-guard";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    surveyId: string;
  }>;
};

export default async function CounselorSurveyEditPage({ params }: PageProps) {
  const current = await requireActiveSubscriptionForCurrentUser();
  const { surveyId } = await params;

  if (current.user.role === "ADMIN") {
    redirect(`/dashboard/admin/surveys/${surveyId}/edit`);
  }

  if (current.user.role === "ACTIVITY_LEADER") {
    redirect(`/dashboard/activity-leader/surveys/${surveyId}/edit`);
  }

  return <SurveyEditShell surveyId={surveyId} boardPath="/dashboard/surveys" />;
}