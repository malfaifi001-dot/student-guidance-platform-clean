import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { AssessmentAnalysisDetail } from "@/components/assessment-center/assessment-analysis-detail";

type PageProps = {
  params: Promise<{
    analysisId: string;
  }>;
};

export default async function AssessmentAnalysisPage({ params }: PageProps) {
  const { analysisId } = await params;
  const context = await requireDashboardPageContext();

  const analysis = await prisma.assessmentAnalysis.findFirst({
    where: {
      id: analysisId,
      ...(context.isAdmin
        ? {}
        : {
            schoolAccountId: context.schoolAccountId,
          }),
    },
  });

  if (!analysis) {
    notFound();
  }

  return <AssessmentAnalysisDetail analysis={analysis} />;
}