import { ReportTemplateStudio } from "@/components/report-engine/report-template-studio";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";

export default async function AdminReportTemplatesPage() {
  await requireAdminPage();

  return <ReportTemplateStudio />;
}
