import { prisma } from "@/lib/prisma";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { AssessmentCenterDashboard } from "@/components/assessment-center/assessment-center-dashboard";

export default async function AssessmentCenterPage() {
  const context = await requireDashboardPageContext();

  const analyses = await prisma.assessmentAnalysis.findMany({
    where: context.isAdmin
      ? {}
      : {
          schoolAccountId: context.schoolAccountId,
        },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  });

  const totalCount = await prisma.assessmentAnalysis.count({
    where: context.isAdmin
      ? {}
      : {
          schoolAccountId: context.schoolAccountId,
        },
  });

  return (
    <AssessmentCenterDashboard analyses={analyses} totalCount={totalCount} />
  );
}