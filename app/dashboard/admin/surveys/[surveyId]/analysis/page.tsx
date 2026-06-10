import { SurveyAnalysisShell } from "@/components/surveys/survey-analysis-shell";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    surveyId: string;
  }>;
};

export default async function AdminSurveyAnalysisPage({ params }: PageProps) {
  await requireAdminPage();
  const { surveyId } = await params;

  return <SurveyAnalysisShell surveyId={surveyId} boardPath="/dashboard/admin/surveys" />;
}