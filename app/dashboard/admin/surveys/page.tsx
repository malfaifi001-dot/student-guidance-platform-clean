import { SurveyCenterShell } from "@/components/surveys/survey-center-shell";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";

export const dynamic = "force-dynamic";

export default async function AdminSurveysPage() {
  await requireAdminPage();

  return <SurveyCenterShell ownerRole="ADMIN" boardPath="/dashboard/admin/surveys" />;
}