import { redirect } from "next/navigation";
import { ActivityLeaderWorkspacePage } from "@/components/workspace/activity-leader-workspace-page";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { getDashboardHomePath } from "@/lib/auth/dashboard-redirects";
import { prisma } from "@/lib/prisma";
import { calculateSchoolIdentityReadiness } from "@/lib/school-identity-readiness";

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
            isActive: true,
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

  const identityReadiness = calculateSchoolIdentityReadiness(
    {
      officialName: current.user.officialName,
      jobTitle: current.user.jobTitle,
      phone: current.user.phone,
      schoolName: current.user.schoolAccount?.profile?.schoolName,
      principalName: current.user.schoolAccount?.profile?.principalName,
      educationDepartment:
        current.user.schoolAccount?.profile?.educationDepartment,
      educationOffice: current.user.schoolAccount?.profile?.educationOffice,
      city: current.user.schoolAccount?.profile?.city,
      district: current.user.schoolAccount?.profile?.district,
      stage: current.user.schoolAccount?.profile?.stage,
      logoUrl: current.user.schoolAccount?.profile?.logoUrl,
    },
    { role: current.user.role, gender: current.user.gender },
  );

  return (
    <ActivityLeaderWorkspacePage
      user={current.user}
      notices={reminders.map((reminder) => ({
        title: reminder.title,
        helper: reminder.scheduledAt.toLocaleDateString("ar-SA"),
      }))}
      stats={{
        students,
        upcomingReminders: reminders.length,
        evidenceItems,
        activityReports,
      }}
      schoolIdentityComplete={identityReadiness.score === 100}
    />
  );
}
