import "server-only";

import { prisma } from "@/lib/prisma";

export type ReportAccessScope = {
  schoolAccountId?: string | null;
  isAdmin?: boolean;
};

export function buildReportAccessWhere(reportId: string, scope: ReportAccessScope) {
  if (scope.isAdmin) {
    return {
      id: reportId,
    };
  }

  const schoolAccountId = scope.schoolAccountId;

  if (!schoolAccountId) {
    throw new Error("لا يمكن الوصول للتقرير بدون ربط المستخدم بمدرسة.");
  }

  return {
    id: reportId,
    caseEntry: {
      schoolAccountId,
    },
  };
}

export function buildCaseAccessWhere(caseEntryId: string, scope: ReportAccessScope) {
  if (scope.isAdmin) {
    return {
      id: caseEntryId,
    };
  }

  const schoolAccountId = scope.schoolAccountId;

  if (!schoolAccountId) {
    throw new Error("لا يمكن الوصول للحالة بدون ربط المستخدم بمدرسة.");
  }

  return {
    id: caseEntryId,
    schoolAccountId,
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
