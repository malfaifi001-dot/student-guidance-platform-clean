import { SoftBlueDashboard } from "@/components/dashboard/soft-blue-dashboard";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const current = await requireDashboardUser();
  const schoolAccountId = current.user.schoolAccountId;

  const [students, cases, reports, evidences] = await Promise.all([
    schoolAccountId
      ? prisma.student.count({
          where: {
            schoolAccountId,
          },
        })
      : 0,

    schoolAccountId
      ? prisma.caseEntry.count({
          where: {
            schoolAccountId,
          },
        })
      : 0,

    prisma.guidanceReport.count({
      where: {
        caseEntry: schoolAccountId
          ? {
              schoolAccountId,
            }
          : undefined,
      },
    }),

    prisma.reportEvidence.count({
      where: {
        report: {
          caseEntry: schoolAccountId
            ? {
                schoolAccountId,
              }
            : undefined,
        },
      },
    }),
  ]);

  return (
    <SoftBlueDashboard
      user={current.user}
      stats={{
        students,
        cases,
        reports,
        evidences,
      }}
    />
  );
}
