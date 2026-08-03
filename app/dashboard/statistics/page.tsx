import { redirect } from "next/navigation";

import {
  requireDashboardPageContext,
} from "@/lib/auth/dashboard-context";

import {
  StatisticsLandingShell,
} from "@/components/statistics/statistics-landing-shell";
import { canAccessStatistics } from "@/lib/statistics/statistics-access";

export default async function StatisticsPage() {
  const context =
    await requireDashboardPageContext();

  if (!canAccessStatistics(context)) {
    redirect("/dashboard");
  }

  return <StatisticsLandingShell />;
}
