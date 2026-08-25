import { NafsAnalysisClient } from "@/components/assessments-center/nafs-analysis-client";
import { GenericAnalysisClient } from "@/components/assessments-center/generic-analysis-client";
import { prisma } from "@/lib/prisma";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";

export default async function NafsAnalysisPage({ params }: { params: Promise<{ analysisId: string }> }) {
  const context = await requireDashboardPageContext();
  const analysis = await prisma.assessmentAnalysis.findFirst({ where: { id: (await params).analysisId, ...(context.isAdmin ? {} : { schoolAccountId: context.schoolAccountId }), uploadMode: { in: ["NAFS", "NAFS_PRE_POST", "MAHIROON", "SUBJECT_PERIODIC"] } }, select: { uploadMode: true } });
  return analysis?.uploadMode === "NAFS_PRE_POST" ? <NafsAnalysisClient analysisId={(await params).analysisId} /> : <GenericAnalysisClient analysisId={(await params).analysisId} />;
}
