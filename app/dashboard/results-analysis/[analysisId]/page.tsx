import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ResultsAnalysisDashboard } from "@/components/results-analysis/results-analysis-dashboard";

type PageProps = {
  params: Promise<{
    analysisId: string;
  }>;
};

export default async function ResultsAnalysisDetailsPage({ params }: PageProps) {
  const { analysisId } = await params;

  const analysis = await prisma.resultsAnalysis.findUnique({
    where: {
      id: analysisId,
    },
  });

  if (!analysis) {
    notFound();
  }

  return <ResultsAnalysisDashboard analysis={analysis} />;
}