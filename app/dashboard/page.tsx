import { redirect } from "next/navigation";
import { SoftBlueDashboard } from "@/components/dashboard/soft-blue-dashboard";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";

function getAttentionWindow() {
  const now = new Date();
  const nextSevenDays = new Date(now);

  nextSevenDays.setDate(now.getDate() + 7);

  return {
    nextSevenDays,
  };
}

export default async function DashboardPage() {
  const current = await requireDashboardUser();

  if (current.user.role === "ADMIN") {
    redirect("/dashboard/admin");
  }
  const schoolAccountId = current.user.schoolAccountId;
  const { nextSevenDays } = getAttentionWindow();

  const [
    students,
    cases,
    reports,
    evidences,
    draftCases,
    readyForReport,
    reminders,
  ] = await Promise.all([
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

    schoolAccountId
      ? prisma.guidanceReport.count({
          where: {
            caseEntry: {
              schoolAccountId,
            },
          },
        })
      : prisma.guidanceReport.count(),

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
      : prisma.reportEvidence.count(),

    schoolAccountId
      ? prisma.caseEntry.count({
          where: {
            schoolAccountId,
            status: "DRAFT",
          },
        })
      : 0,

    schoolAccountId
      ? prisma.caseEntry.count({
          where: {
            schoolAccountId,
            status: "SUBMITTED",
            guidanceReports: {
              none: {},
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
    <SoftBlueDashboard
      user={current.user}
      stats={{
        students,
        cases,
        reports,
        evidences,
        draftCases,
        readyForReport,
      }}
      attentionReminders={reminders}
    />
  );
}
