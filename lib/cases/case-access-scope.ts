import type { Prisma } from "@prisma/client";

type CaseScopeUser = {
  id: string;
  role: string;
  schoolAccountId?: string | null;
};

const ACTIVITY_PROGRAM_SERVICE_SLUGS = [
  "activity-programs",
  "activity-programs-citizenship-life",
  "activity-programs-science-technology",
  "activity-programs-culture-arts",
  "activity-programs-sports-health",
  "activity-programs-scouting",
  "activity-programs-events-occasions",
  "activity-programs-non-class-periods",
];

function activityProgramServiceScope() {
  return {
    in: ACTIVITY_PROGRAM_SERVICE_SLUGS,
  };
}

export function buildCaseEntryWhereForUser(
  user: CaseScopeUser,
): Prisma.CaseEntryWhereInput {
  if (user.role === "ADMIN") {
    return {};
  }

  const schoolAccountId = user.schoolAccountId || "__NO_SCHOOL__";

  if (user.role === "ACTIVITY_LEADER") {
    return {
      schoolAccountId,
      service: {
        slug: activityProgramServiceScope(),
      },
    };
  }

  if (user.role === "STAFF") {
    return {
      schoolAccountId,
      createdById: user.id || "__NO_USER__",
    };
  }

  return {
    schoolAccountId,
  };
}

const CASE_DELETE_ROLES = new Set([
  "ADMIN",
  "COUNSELOR",
  "ACTIVITY_LEADER",
  "SCHOOL_OWNER",
  "STAFF",
]);

export function roleCanDeleteCase(role: string) {
  return CASE_DELETE_ROLES.has(role);
}

export function getCaseCenterScopeLabel(role: string) {
  if (role === "ADMIN") return "كل الحالات";
  if (role === "ACTIVITY_LEADER") return "حالات برامج النشاط";
  if (role === "COUNSELOR") return "حالات المدرسة";
  if (role === "SCHOOL_OWNER") return "حالات المدرسة";
  if (role === "STAFF") return "الحالات المرتبطة بك";

  return "الحالات المتاحة";
}
