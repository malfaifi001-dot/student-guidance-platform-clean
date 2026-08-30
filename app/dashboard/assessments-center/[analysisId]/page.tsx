import { NafsAnalysisClient } from "@/components/assessments-center/nafs-analysis-client";
import { GenericAnalysisClient } from "@/components/assessments-center/generic-analysis-client";
import { prisma } from "@/lib/prisma";
import { assessmentAnalysisOwnershipWhere } from "@/lib/assessments-center/assessment-ownership";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";

export default async function NafsAnalysisPage({ params, searchParams }: { params: Promise<{ analysisId: string }>; searchParams: Promise<{ mode?: string }> }) {
  const context = await requireDashboardPageContext({ allowPrincipal: true });
  const { analysisId } = await params;
  const analysis = await prisma.assessmentAnalysis.findFirst({ where: { id: analysisId, ...(context.isAdmin ? {} : assessmentAnalysisOwnershipWhere(context.schoolAccountId, context.user.id)), uploadMode: { in: ["NAFS", "NAFS_PRE_POST", "MAHIROON", "SUBJECT_PERIODIC"] } }, select: { uploadMode: true } });
  const { mode } = await searchParams;
  if (mode === "edit" && analysis) {
    const { AssessmentNewClient } = await import("@/components/assessments-center/assessment-new-client");
    return <AssessmentNewClient editAnalysisId={analysisId} gender={context.user.gender} />;
  }
  return analysis?.uploadMode === "NAFS_PRE_POST" ? <NafsAnalysisClient analysisId={analysisId} gender={context.user.gender} /> : <GenericAnalysisClient analysisId={analysisId} gender={context.user.gender} />;
}
