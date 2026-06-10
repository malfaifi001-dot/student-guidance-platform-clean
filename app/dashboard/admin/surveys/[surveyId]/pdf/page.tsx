import { SurveyPrintReportShell } from "@/components/surveys/survey-print-report-shell";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    surveyId: string;
  }>;
};

export default async function AdminSurveyPdfPage({ params }: PageProps) {
  await requireAdminPage();
  const { surveyId } = await params;

  return (
    <SurveyPrintReportShell
      surveyId={surveyId}
      backPath={`/dashboard/admin/surveys/${surveyId}/analysis`}
    />
  );
}