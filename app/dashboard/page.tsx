import { redirect } from "next/navigation";
import { CounselorWorkspacePage } from "@/components/workspace/counselor-workspace-page";
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

export default async function DashboardPage() {
  const current = await requireDashboardUser();

  if (
    current.user.role === "ADMIN" ||
    current.user.role === "ACTIVITY_LEADER" ||
    current.user.role === "TEACHER" ||
    current.user.role === "PRINCIPAL"
  ) {
    redirect(getDashboardHomePath(current.user.role));
  }

  const schoolAccountId = current.user.schoolAccountId;
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
            isActive: true,
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
    <CounselorWorkspacePage
      user={current.user}
      stats={{
        students,
        cases,
        reports,
        evidences,
        draftCases,
        readyForReport,
      }}
      remindersCount={reminders.length}
      schoolIdentityComplete={identityReadiness.score === 100}
    />
  );
}
