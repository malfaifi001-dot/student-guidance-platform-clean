import { AdminActivityMetricsPanel } from "@/components/admin/admin-activity-metrics-panel";
import { AdminOperationalAlertsPanel } from "@/components/admin/admin-operational-alerts-panel";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";

export default async function AdminDashboardPage() {
  await requireAdminPage();

  
  return (
    <div className="space-y-6">
      <AdminOperationalAlertsPanel />
      <AdminActivityMetricsPanel />
    </div>
  );
}
