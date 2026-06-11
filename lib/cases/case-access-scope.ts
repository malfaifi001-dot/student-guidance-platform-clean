import type { Prisma } from "@prisma/client";

type CaseScopeUser = {
  id: string;
  role: string;
  schoolAccountId?: string | null;
};

function activityProgramServiceScope() {
  return {
    startsWith: "activity-programs",
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

export function getCaseCenterScopeLabel(role: string) {
  if (role === "ADMIN") return "كل الحالات";
  if (role === "ACTIVITY_LEADER") return "حالات برامج النشاط";
  if (role === "COUNSELOR") return "حالات المدرسة";
  if (role === "SCHOOL_OWNER") return "حالات المدرسة";
  if (role === "STAFF") return "الحالات المرتبطة بك";

  return "الحالات المتاحة";
}