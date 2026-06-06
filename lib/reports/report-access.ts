import "server-only";

import { prisma } from "@/lib/prisma";

export type ReportAccessScope = {
  schoolAccountId?: string | null;
  isAdmin?: boolean;
  userId?: string | null;
  userRole?: string | null;
};

function canSeeAllSchoolReports(scope: ReportAccessScope) {
  return Boolean(
    scope.isAdmin ||
      scope.userRole === "ADMIN" ||
      scope.userRole === "SCHOOL_OWNER"
  );
}

export function buildReportAccessWhere(reportId: string, scope: ReportAccessScope) {
  if (scope.isAdmin || scope.userRole === "ADMIN") {
    return {
      id: reportId,
    };
  }

  const schoolAccountId = scope.schoolAccountId;

  if (!schoolAccountId) {
    throw new Error("لا يمكن الوصول للتقرير بدون ربط المستخدم بمدرسة.");
  }

  if (canSeeAllSchoolReports(scope)) {
    return {
      id: reportId,
      caseEntry: {
        schoolAccountId,
      },
    };
  }

  if (!scope.userId) {
    throw new Error("لا يمكن الوصول للتقرير بدون مستخدم.");
  }

  return {
    id: reportId,
    caseEntry: {
      schoolAccountId,
      createdById: scope.userId,
    },
  };
}

export function buildReportListWhere(scope: ReportAccessScope) {
  if (scope.isAdmin || scope.userRole === "ADMIN") {
    return {};
  }

  const schoolAccountId = scope.schoolAccountId;

  if (!schoolAccountId) {
    throw new Error("لا يمكن جلب التقارير بدون ربط المستخدم بمدرسة.");
  }

  if (canSeeAllSchoolReports(scope)) {
    return {
      caseEntry: {
        schoolAccountId,
      },
    };
  }

  if (!scope.userId) {
    throw new Error("لا يمكن جلب التقارير بدون مستخدم.");
  }

  return {
    caseEntry: {
      schoolAccountId,
      createdById: scope.userId,
    },
  };
}

export function buildCaseAccessWhere(caseEntryId: string, scope: ReportAccessScope) {
  if (scope.isAdmin || scope.userRole === "ADMIN") {
    return {
      id: caseEntryId,
    };
  }

  const schoolAccountId = scope.schoolAccountId;

  if (!schoolAccountId) {
    throw new Error("لا يمكن الوصول للحالة بدون ربط المستخدم بمدرسة.");
  }

  if (canSeeAllSchoolReports(scope)) {
    return {
      id: caseEntryId,
      schoolAccountId,
    };
  }

  if (!scope.userId) {
    throw new Error("لا يمكن الوصول للحالة بدون مستخدم.");
  }

  return {
    id: caseEntryId,
    schoolAccountId,
    createdById: scope.userId,
  };
}

export async function getReportAccess(reportId: string, scope: ReportAccessScope) {
  return prisma.guidanceReport.findFirst({
    where: buildReportAccessWhere(reportId, scope),
    select: {
      id: true,
      title: true,
      status: true,
      serviceSlug: true,
      caseEntryId: true,
      caseEntry: {
        select: {
          id: true,
          schoolAccountId: true,
          createdById: true,
          service: {
            select: {
              id: true,
              slug: true,
              name: true,
            },
          },
        },
      },
    },
  });
}
