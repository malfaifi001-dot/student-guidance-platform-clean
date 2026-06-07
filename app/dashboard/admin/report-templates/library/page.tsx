import { requireAdminPage } from "@/lib/admin/admin-page-guard";
import { ReportTemplateLibrary } from "@/components/report-engine/report-template-library";

export default async function AdminReportTemplateLibraryPage() {
  await requireAdminPage();

  return <ReportTemplateLibrary />;
}
