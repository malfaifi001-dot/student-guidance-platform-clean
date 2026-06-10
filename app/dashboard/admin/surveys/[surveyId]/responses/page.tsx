import { SurveyResponsesShell } from "@/components/surveys/survey-responses-shell";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    surveyId: string;
  }>;
};

export default async function AdminSurveyResponsesPage({ params }: PageProps) {
  await requireAdminPage();
  const { surveyId } = await params;

  return <SurveyResponsesShell surveyId={surveyId} boardPath="/dashboard/admin/surveys" />;
}