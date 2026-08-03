import { buildCaseEntryPermissionWhere } from "@/lib/cases/case-permissions";
import type { Prisma } from "@prisma/client";

type ReportScopeUser = {
  id: string;
  role: string;
  schoolAccountId?: string | null;
  email?: string | null;
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
  "custom-report",
];

export function buildCaseEntryReportWhereForUser(
  user: ReportScopeUser,
): Prisma.CaseEntryWhereInput {
  if (user.role === "ACTIVITY_LEADER") {
    return {
      schoolAccountId: user.schoolAccountId || "__NO_SCHOOL__",
      service: {
        slug: { in: ACTIVITY_LEADER_REPORT_SERVICE_SLUGS },
      },
    };
  }

  return buildCaseEntryPermissionWhere(user);
}

export function buildGuidanceReportWhereForUser(
  user: ReportScopeUser,
): Prisma.GuidanceReportWhereInput {
  if (user.role === "ADMIN") {
    return {};
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
