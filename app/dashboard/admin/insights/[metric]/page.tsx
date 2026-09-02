import { notFound } from "next/navigation";
import { AdminInsightsPage } from "@/components/admin-insights/admin-insights-page";
import { isAdminInsightMetric } from "@/lib/admin-insights/admin-insights-service";
import { requireAdminPage } from "@/lib/admin/admin-page-guard";

export default async function AdminInsightRoute({ params }: { params: Promise<{ metric: string }> }) {
  await requireAdminPage();
  const { metric } = await params;
  if (!isAdminInsightMetric(metric)) notFound();
  return <AdminInsightsPage metric={metric} />;
}
