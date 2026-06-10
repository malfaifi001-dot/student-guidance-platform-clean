import { redirect } from "next/navigation";
import { SurveyPrintReportShell } from "@/components/surveys/survey-print-report-shell";
import { requireActiveSubscriptionForCurrentUser } from "@/lib/subscription/subscription-guard";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    surveyId: string;
  }>;
};

export default async function ActivityLeaderSurveyPdfPage({ params }: PageProps) {
  const current = await requireActiveSubscriptionForCurrentUser();
  const { surveyId } = await params;

  if (current.user.role === "ADMIN") {
    redirect(`/dashboard/admin/surveys/${surveyId}/pdf`);
  }

  if (current.user.role !== "ACTIVITY_LEADER") {
    redirect(`/dashboard/surveys/${surveyId}/pdf`);
  }

  return (
    <SurveyPrintReportShell
      surveyId={surveyId}
      backPath={`/dashboard/activity-leader/surveys/${surveyId}/analysis`}
    />
  );
}