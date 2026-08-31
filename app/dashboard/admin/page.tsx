import { AdminActivityMetricsPanel } from "@/components/admin/admin-activity-metrics-panel";
import { AdminOperationalAlertsPanel } from "@/components/admin/admin-operational-alerts-panel";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";

export default async function AdminDashboardPage() {
  const current = await requireAdminPage();

  
  return (
    <div className="space-y-6">
      <DashboardHero
        roleLabel="إدارة المنصة"
        userName={current.user.officialName || current.user.name}
        supportingLine="تابع مؤشرات المنصة والتنبيهات التشغيلية من مساحة الإدارة."
      />
      <AdminOperationalAlertsPanel />
      <AdminActivityMetricsPanel />
    </div>
  );
}
