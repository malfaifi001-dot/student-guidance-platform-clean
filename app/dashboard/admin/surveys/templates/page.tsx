import { SurveyTemplatesShell } from "@/components/surveys/survey-templates-shell";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";

export const dynamic = "force-dynamic";

export default async function AdminSurveyTemplatesPage() {
  await requireAdminPage();

  return <SurveyTemplatesShell ownerRole="ADMIN" boardPath="/dashboard/admin/surveys" />;
}