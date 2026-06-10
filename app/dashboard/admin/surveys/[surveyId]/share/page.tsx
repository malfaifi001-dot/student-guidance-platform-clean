import { SurveyShareShell } from "@/components/surveys/survey-share-shell";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    surveyId: string;
  }>;
};

export default async function AdminSurveySharePage({ params }: PageProps) {
  await requireAdminPage();
  const { surveyId } = await params;

  return <SurveyShareShell surveyId={surveyId} boardPath="/dashboard/admin/surveys" />;
}