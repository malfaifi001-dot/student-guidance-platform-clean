import { prisma } from "@/lib/prisma";
import { assessmentAnalysisOwnershipWhere } from "@/lib/assessments-center/assessment-ownership";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { buildNafsDevelopmentPlanHtml } from "@/lib/assessments-center/nafs-report";

export default async function NafsDevelopmentPlanPage({ params }: { params: Promise<{ analysisId: string }> }) {
  const context = await requireDashboardPageContext({ allowPrincipal: true });
  const analysis = await prisma.assessmentAnalysis.findFirst({ where: { id: (await params).analysisId, ...(context.isAdmin ? {} : assessmentAnalysisOwnershipWhere(context.schoolAccountId, context.user.id)), uploadMode: "NAFS" }, select: { summaryJson: true } });
  if (!analysis?.summaryJson) return <main dir="rtl" className="p-8">التحليل غير موجود.</main>;
  return <div dangerouslySetInnerHTML={{ __html: buildNafsDevelopmentPlanHtml(analysis.summaryJson as never) }} />;
}
