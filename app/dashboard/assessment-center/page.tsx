import { prisma } from "@/lib/prisma";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { AssessmentCenterDashboard } from "@/components/assessment-center/assessment-center-dashboard";
import { assessmentAnalysisOwnershipWhere } from "@/lib/assessments-center/assessment-ownership";

export default async function AssessmentCenterPage() {
  const context = await requireDashboardPageContext();

  const analyses = await prisma.assessmentAnalysis.findMany({
    where: context.isAdmin
      ? {}
      : assessmentAnalysisOwnershipWhere(context.schoolAccountId, context.user.id, { historicalPersonalRead: true }),
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  });

  const totalCount = await prisma.assessmentAnalysis.count({
    where: context.isAdmin
      ? {}
      : assessmentAnalysisOwnershipWhere(context.schoolAccountId, context.user.id, { historicalPersonalRead: true }),
  });

  return (
    <AssessmentCenterDashboard analyses={analyses} totalCount={totalCount} />
  );
}
