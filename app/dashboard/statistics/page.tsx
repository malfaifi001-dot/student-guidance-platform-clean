import { redirect } from "next/navigation";

import {
  requireDashboardPageContext,
} from "@/lib/auth/dashboard-context";

import {
  StatisticsLandingShell,
} from "@/components/statistics/statistics-landing-shell";

export default async function StatisticsPage() {
  const context =
    await requireDashboardPageContext();

  if (
    context.user.role !== "ADMIN" &&
    context.user.role !== "COUNSELOR"
  ) {
    redirect("/dashboard");
  }

  return <StatisticsLandingShell />;
}