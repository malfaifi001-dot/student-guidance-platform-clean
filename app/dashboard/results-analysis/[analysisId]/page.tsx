import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { buildResultsAnalysisAccessWhere, buildResultsAnalysisListWhere } from "@/lib/results-analysis/results-analysis-access";
import { ResultsAnalysisDashboard } from "@/components/results-analysis/results-analysis-dashboard";

type PageProps = {
  params: Promise<{
    analysisId: string;
  }>;
};

export default async function ResultsAnalysisDetailsPage({ params }: PageProps) {
  const context = await requireDashboardPageContext();
  const { analysisId } = await params;

  const analysis = await prisma.resultsAnalysis.findFirst({ where: buildResultsAnalysisAccessWhere(analysisId, { schoolAccountId: context.schoolAccountId, isAdmin: context.isAdmin }),
  });

  if (!analysis) {
    notFound();
  }

  return <ResultsAnalysisDashboard analysis={analysis} />;
}



