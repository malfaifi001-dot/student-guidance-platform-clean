import { SurveyEditShell } from "@/components/surveys/survey-edit-shell";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    surveyId: string;
  }>;
};

export default async function AdminSurveyEditPage({ params }: PageProps) {
  await requireAdminPage();
  const { surveyId } = await params;

  return <SurveyEditShell surveyId={surveyId} boardPath="/dashboard/admin/surveys" />;
}