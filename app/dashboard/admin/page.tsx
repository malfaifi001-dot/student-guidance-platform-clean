import { AdminActivityMetricsPanel } from "@/components/admin/admin-activity-metrics-panel";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { redirect } from "next/navigation";

export default async function AdminDashboardPage() {
  const current = await requireDashboardUser();

  if (current.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return <AdminActivityMetricsPanel />;
}
