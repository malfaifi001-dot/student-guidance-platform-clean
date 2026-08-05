import { redirect } from "next/navigation";

import { PortfolioPrintDocument } from "@/components/portfolio/print/portfolio-print-document";
import { PortfolioPrintActions } from "@/components/portfolio/print/portfolio-print-actions";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { getTeacherPortfolioWorkspace } from "@/lib/portfolio/portfolio-read-model";

type TeacherPortfolioPrintPageProps = {
  searchParams: Promise<{ portfolioId?: string | string[] }>;
};

export default async function TeacherPortfolioPrintPage({ searchParams }: TeacherPortfolioPrintPageProps) {
  const current = await requireDashboardUser();

  if (current.user.role === "ADMIN") {
    redirect("/dashboard/admin");
  }

  if (current.user.role !== "TEACHER") {
    redirect("/dashboard");
  }

  const query = await searchParams;
  const portfolioId = Array.isArray(query.portfolioId) ? query.portfolioId[0] : query.portfolioId;
  const workspace = await getTeacherPortfolioWorkspace(current.user, portfolioId);

  if (!workspace.ok) {
    redirect("/dashboard/onboarding?required=true");
  }

  const printWorkspace = {
    ...workspace,
    customEvidence: workspace.customEvidence.filter(
      (item) => item.isVisible && Boolean(item.fileUrl),
    ),
  };

  return (
    <main dir="rtl">
      <PortfolioPrintActions />
      <PortfolioPrintDocument data={printWorkspace} />
    </main>
  );
}
