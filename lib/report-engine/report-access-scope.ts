type ReportScopeUser = {
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

function activityProgramSlugScope() {
  return {
    in: ACTIVITY_PROGRAM_SERVICE_SLUGS,
  };
}

export function buildCaseEntryReportWhereForUser(user: ReportScopeUser): any {
  if (user.role === "ADMIN") {
    return {};
  }

  const schoolAccountId = user.schoolAccountId || "__NO_SCHOOL__";

  if (user.role === "ACTIVITY_LEADER") {
    return {
      schoolAccountId,
      service: {
        slug: activityProgramSlugScope(),
      },
    };
  }

  if (user.role === "STAFF") {
    return {
      schoolAccountId,
      createdById: user.id,
    };
  }

  return {
    schoolAccountId,
  };
}

export function buildGuidanceReportWhereForUser(user: ReportScopeUser): any {
  if (user.role === "ADMIN") {
    return {};
  }

  const schoolAccountId = user.schoolAccountId || "__NO_SCHOOL__";

  if (user.role === "ACTIVITY_LEADER") {
    return {
      serviceSlug: activityProgramSlugScope(),
      caseEntry: {
        is: {
          schoolAccountId,
        },
      },
    };
  }

  if (user.role === "STAFF") {
    return {
      caseEntry: {
        is: {
          schoolAccountId,
          createdById: user.id,
        },
      },
    };
  }

  return {
    caseEntry: {
      is: {
        schoolAccountId,
      },
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