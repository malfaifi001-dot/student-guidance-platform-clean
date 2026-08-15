import { AdminAccountingDashboard } from "@/components/admin/accounting/admin-accounting-dashboard";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";
import { getAccountingDashboardData } from "@/lib/admin/accounting/accounting-service";

export default async function AdminAccountingPage() {
  await requireAdminPage();
  const data = await getAccountingDashboardData();
  return <AdminAccountingDashboard key={data.generatedAt} initialData={data} />;
}
