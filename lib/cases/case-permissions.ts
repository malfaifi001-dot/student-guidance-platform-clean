import type { Prisma } from "@prisma/client";
import { STUDENT_ACTIVITY_COMPETITIONS_SERVICE_SLUG } from "@/lib/activity-competitions/activity-competitions-service";

export type CasePermissionUser = {
  id: string;
  role: string;
  schoolAccountId?: string | null;
  email?: string | null;
};

export type CasePermissionSubject = {
  schoolAccountId: string;
  createdById?: string | null;
  status?: string | null;
  service?: { slug?: string | null } | null;
  activityAssignment?: {
    teacherEmail?: string | null;
    status?: string | null;
  } | null;
};

export type CaseCapabilities = {
  canViewCase: boolean;
  canEditCase: boolean;
  canDeleteCase: boolean;
  canOpenCaseReport: boolean;
  canDeleteCaseReport: boolean;
};

const ACTIVITY_PROGRAM_SERVICE_SLUGS = new Set([
  "activity-programs",
  "activity-programs-citizenship-life",
  "activity-programs-science-technology",
  "activity-programs-culture-arts",
  "activity-programs-sports-health",
  "activity-programs-scouting",
  "activity-programs-events-occasions",
  "activity-programs-non-class-periods",
  "activity-programs-school-broadcast",
  STUDENT_ACTIVITY_COMPETITIONS_SERVICE_SLUG,
]);

const LOCKED_TEACHER_ASSIGNMENT_STATUSES = new Set([
  "SUBMITTED",
  "APPROVED",
  "EXPIRED",
  "CANCELED",
]);

function cleanEmail(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function isActivityProgramCase(caseEntry: CasePermissionSubject) {
  return ACTIVITY_PROGRAM_SERVICE_SLUGS.has(
    String(caseEntry.service?.slug || "").trim(),
  );
}

function isAssignedTeacher(
  user: CasePermissionUser,
  caseEntry: CasePermissionSubject,
) {
  const userEmail = cleanEmail(user.email);
  const assignmentEmail = cleanEmail(caseEntry.activityAssignment?.teacherEmail);

  return Boolean(userEmail && assignmentEmail && userEmail === assignmentEmail);
}

export function buildCaseEntryPermissionWhere(
  user: CasePermissionUser,
): Prisma.CaseEntryWhereInput {
  if (user.role === "ADMIN") return {};

  const schoolAccountId = user.schoolAccountId || "__NO_SCHOOL__";

  if (user.role === "ACTIVITY_LEADER") {
    return {
      schoolAccountId,
      service: {
        slug: { in: Array.from(ACTIVITY_PROGRAM_SERVICE_SLUGS) },
      },
    };
  }

  if (user.role === "TEACHER") {
    const ownershipScope: Prisma.CaseEntryWhereInput[] = [
      { createdById: user.id || "__NO_USER__" },
    ];
    const email = cleanEmail(user.email);

    if (email) {
      ownershipScope.push({
        activityAssignment: {
          is: { teacherEmail: email },
        },
      });
    }

    return {
      schoolAccountId,
      service: {
        slug: { not: STUDENT_ACTIVITY_COMPETITIONS_SERVICE_SLUG },
      },
      OR: ownershipScope,
    };
  }

  if (user.role === "STAFF") {
    return {
      schoolAccountId,
      createdById: user.id || "__NO_USER__",
      service: {
        slug: { not: STUDENT_ACTIVITY_COMPETITIONS_SERVICE_SLUG },
      },
    };
  }

  if (user.role === "PRINCIPAL") {
    return {
      schoolAccountId,
      createdById: user.id || "__NO_USER__",
      service: {
        slug: { not: STUDENT_ACTIVITY_COMPETITIONS_SERVICE_SLUG },
      },
    };
  }

  return {
    schoolAccountId,
    service: {
      slug: { not: STUDENT_ACTIVITY_COMPETITIONS_SERVICE_SLUG },
    },
  };
}

export function resolveCaseCapabilities(
  user: CasePermissionUser,
  caseEntry: CasePermissionSubject,
): CaseCapabilities {
  if (user.role === "ADMIN") {
    return {
      canViewCase: true,
      canEditCase: true,
      canDeleteCase: true,
      canOpenCaseReport: true,
      canDeleteCaseReport: true,
    };
  }

  const sameSchool = Boolean(
    user.schoolAccountId &&
      caseEntry.schoolAccountId === user.schoolAccountId,
  );

  if (!sameSchool) {
    return {
      canViewCase: false,
      canEditCase: false,
      canDeleteCase: false,
      canOpenCaseReport: false,
      canDeleteCaseReport: false,
    };
  }

  if (
    caseEntry.service?.slug === STUDENT_ACTIVITY_COMPETITIONS_SERVICE_SLUG &&
    user.role !== "ACTIVITY_LEADER"
  ) {
    return {
      canViewCase: false,
      canEditCase: false,
      canDeleteCase: false,
      canOpenCaseReport: false,
      canDeleteCaseReport: false,
    };
  }

  const isOwner = Boolean(user.id && caseEntry.createdById === user.id);
  const assignedTeacher = isAssignedTeacher(user, caseEntry);
  const assignmentLocked = LOCKED_TEACHER_ASSIGNMENT_STATUSES.has(
    String(caseEntry.activityAssignment?.status || ""),
  );

  let canManage = false;
  let canView = false;

  if (["COUNSELOR", "SCHOOL_OWNER"].includes(user.role)) {
    canView = true;
    canManage = true;
  } else if (user.role === "PRINCIPAL") {
    canView = isOwner;
    canManage = false;
  } else if (user.role === "ACTIVITY_LEADER") {
    canView = isActivityProgramCase(caseEntry);
    canManage = canView;
  } else if (user.role === "TEACHER") {
    canView = isOwner || assignedTeacher;
    canManage = canView && !assignmentLocked;
  } else if (user.role === "STAFF") {
    canView = isOwner;
    canManage = isOwner;
  }

  return {
    canViewCase: canView,
    canEditCase: canManage,
    canDeleteCase: canManage,
    canOpenCaseReport: canView,
    canDeleteCaseReport: canManage,
  };
}
