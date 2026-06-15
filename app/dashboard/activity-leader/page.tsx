import { redirect } from "next/navigation";
import { ActivityLeaderWorkspacePage } from "@/components/workspace/activity-leader-workspace-page";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { getDashboardHomePath } from "@/lib/auth/dashboard-redirects";
import { prisma } from "@/lib/prisma";

function getAttentionWindow() {
  const now = new Date();
  const nextSevenDays = new Date(now);

  nextSevenDays.setDate(now.getDate() + 7);

  return {
    nextSevenDays,
  };
}

export default async function ActivityLeaderDashboardPage() {
  const current = await requireDashboardUser();

  if (current.user.role !== "ACTIVITY_LEADER") {
    redirect(getDashboardHomePath(current.user.role));
  }

  const schoolAccountId = current.user.schoolAccountId;
  const { nextSevenDays } = getAttentionWindow();

  const [students, evidenceItems, activityReports, reminders] = await Promise.all([
    schoolAccountId
      ? prisma.student.count({
          where: {
            schoolAccountId,
          },
        })
      : 0,

    schoolAccountId
      ? prisma.reportEvidence.count({
          where: {
            report: {
              caseEntry: {
                schoolAccountId,
              },
            },
          },
        })
      : 0,

    schoolAccountId
      ? prisma.guidanceReport.count({
          where: {
            caseEntry: {
              schoolAccountId,
            },
          },
        })
      : 0,

    schoolAccountId
      ? prisma.calendarReminder.findMany({
          where: {
            schoolAccountId,
            status: "PENDING",
            scheduledAt: {
              lte: nextSevenDays,
            },
          },
          orderBy: {
            scheduledAt: "asc",
          },
          take: 3,
          include: {
            service: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            caseEntry: {
              select: {
                id: true,
                title: true,
                status: true,
                service: {
                  select: {
                    name: true,
                    slug: true,
                  },
                },
              },
            },
            student: {
              select: {
                id: true,
                fullName: true,
                grade: true,
                classroom: true,
              },
            },
          },
        })
      : [],
  ]);

  return (
    <ActivityLeaderWorkspacePage
      user={current.user}
      stats={{
        students,
        upcomingReminders: reminders.length,
        evidenceItems,
        activityReports,
      }}
    />
  );
}