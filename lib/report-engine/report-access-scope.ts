import { buildCaseEntryPermissionWhere } from "@/lib/cases/case-permissions";
import type { Prisma } from "@prisma/client";
import { STUDENT_ACTIVITY_COMPETITIONS_SERVICE_SLUG } from "@/lib/activity-competitions/activity-competitions-service";

type ReportScopeUser = {
  id: string;
  role: string;
  schoolAccountId?: string | null;
  email?: string | null;
  historicalPersonalRead?: boolean;
};

const ACTIVITY_LEADER_REPORT_SERVICE_SLUGS = [
  "activity-programs",
  "activity-programs-citizenship-life",
  "activity-programs-science-technology",
  "activity-programs-culture-arts",
  "activity-programs-sports-health",
  "activity-programs-scouting",
  "activity-programs-events-occasions",
  "activity-programs-non-class-periods",
  "activity-programs-school-broadcast",
  "custom-report",
  STUDENT_ACTIVITY_COMPETITIONS_SERVICE_SLUG,
];

export function buildCaseEntryReportWhereForUser(
  user: ReportScopeUser,
): Prisma.CaseEntryWhereInput {
  if (user.role === "ACTIVITY_LEADER") {
    const activityServiceScope = {
      service: {
        slug: { in: ACTIVITY_LEADER_REPORT_SERVICE_SLUGS },
      },
    };
    const schoolScope = {
      schoolAccountId: user.schoolAccountId || "__NO_SCHOOL__",
      ...activityServiceScope,
    };

    if (user.historicalPersonalRead) {
      return {
        OR: [schoolScope, { ...activityServiceScope, createdById: user.id }],
      };
    }

    return {
      ...schoolScope,
    };
  }

  return buildCaseEntryPermissionWhere({
    ...user,
    historicalPersonalRead: user.historicalPersonalRead,
  });
}

export function buildGuidanceReportWhereForUser(
  user: ReportScopeUser,
): Prisma.GuidanceReportWhereInput {
  if (user.role === "ADMIN") {
    return {};
  }

  if (user.role === "PRINCIPAL") {
    const schoolAccountId = user.schoolAccountId || "__NO_SCHOOL__";
    return {
      OR: [
        {
          caseEntry: {
            is: {
              ...(user.historicalPersonalRead ? {} : { schoolAccountId }),
              createdById: user.id,
            },
          },
        },
        {
          internalAssignments: {
            some: {
              schoolAccountId,
              createdById: user.id,
              status: { in: ["SUBMITTED", "COMPLETED"] },
            },
          },
        },
      ],
    };
  }

  return {
    caseEntry: {
      is: buildCaseEntryReportWhereForUser(user),
    },
  };
}

export function getReportCaseScopeLabel(role: string) {
  if (role === "ADMIN") return "كل الحالات";
  if (role === "ACTIVITY_LEADER") return "حالات برامج النشاط";
  if (role === "COUNSELOR") return "حالات المدرسة";
  if (role === "SCHOOL_OWNER") return "حالات المدرسة";
  if (role === "STAFF") return "الحالات المرتبطة بك";

  return "الحالات المتاحة";
}
