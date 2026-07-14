import { redirect } from "next/navigation";

import { MinistryElegantPortfolioPrint } from "@/components/portfolio/print/ministry-elegant-portfolio-print";
import { PortfolioPrintActions } from "@/components/portfolio/print/portfolio-print-actions";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { getTeacherPortfolioWorkspace } from "@/lib/portfolio/portfolio-read-model";

export default async function TeacherPortfolioPreviewPage() {
  const current = await requireDashboardUser();

  if (current.user.role === "ADMIN") {
    redirect("/dashboard/admin");
  }

  if (current.user.role !== "TEACHER") {
    redirect("/dashboard");
  }

  const workspace = await getTeacherPortfolioWorkspace(current.user);

  if (!workspace.ok) {
    redirect("/dashboard/onboarding?required=true");
  }

  return (
    <>
      <PortfolioPrintActions />
      <MinistryElegantPortfolioPrint data={workspace} />
    </>
  );
}