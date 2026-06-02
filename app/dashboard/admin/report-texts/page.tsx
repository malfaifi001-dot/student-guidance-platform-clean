import { ReportTextTemplateStudio } from "@/components/admin/report-text-template-studio";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";

export default async function ReportTextTemplatesStudioPage() {
  await requireAdminPage();

  return <ReportTextTemplateStudio />;
}
