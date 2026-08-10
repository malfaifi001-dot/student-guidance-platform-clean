import { redirect } from "next/navigation";

import { PortfolioPrintDocument } from "@/components/portfolio/print/portfolio-print-document";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { getTeacherPortfolioWorkspace } from "@/lib/portfolio/portfolio-read-model";

type TeacherPortfolioPreviewPageProps = {
  searchParams: Promise<{ portfolioId?: string | string[] }>;
};

export default async function TeacherPortfolioPreviewPage({
  searchParams,
}: TeacherPortfolioPreviewPageProps) {
  const current = await requireDashboardUser();

  if (current.user.role === "ADMIN") {
    redirect("/dashboard/admin");
  }

  if (current.user.role !== "TEACHER") {
    redirect("/dashboard");
  }

  const query = await searchParams;
  const portfolioId = Array.isArray(query.portfolioId)
    ? query.portfolioId[0]
    : query.portfolioId;

  const workspace = await getTeacherPortfolioWorkspace(
    current.user,
    portfolioId,
  );

  if (!workspace.ok) {
    redirect("/dashboard/onboarding?required=true");
  }

  const previewWorkspace = {
    ...workspace,
    customEvidence: workspace.customEvidence.filter(
      (item) => item.isVisible && Boolean(item.fileUrl),
    ),
  };

  return (
    <main dir="rtl">
      <PortfolioPrintDocument data={previewWorkspace} />
    </main>
  );
}
