import "server-only";

import type { DashboardContext } from "@/lib/auth/dashboard-context";
import { buildCaseEntryReportWhereForUser } from "@/lib/report-engine/report-access-scope";
import { prisma } from "@/lib/prisma";

export type ReportTwoCapability =
  | "REPORT_VIEW"
  | "REPORT_EDIT"
  | "REPORT_APPROVE"
  | "REPORT_EXPORT"
  | "REPORT_ARCHIVE"
  | "REPORT_DELETE"
  | "CASE_EDIT_AND_SYNC_REPORT";

const SCHOOL_REPORT_CAPABILITIES = new Set<ReportTwoCapability>([
  "REPORT_VIEW",
  "REPORT_EDIT",
  "REPORT_APPROVE",
  "REPORT_EXPORT",
  "REPORT_ARCHIVE",
  "REPORT_DELETE",
  "CASE_EDIT_AND_SYNC_REPORT",
]);

const LIMITED_REPORT_CAPABILITIES = new Set<ReportTwoCapability>([
  "REPORT_VIEW",
  "REPORT_EDIT",
  "REPORT_APPROVE",
  "REPORT_EXPORT",
  "REPORT_DELETE",
  "CASE_EDIT_AND_SYNC_REPORT",
]);

export function roleHasReportTwoCapability(
  role: string,
  capability: ReportTwoCapability,
) {
  if (role === "ADMIN") return true;
  if (role === "PRINCIPAL") return capability === "REPORT_VIEW";
  if (["COUNSELOR", "ACTIVITY_LEADER", "SCHOOL_OWNER"].includes(role)) {
    return SCHOOL_REPORT_CAPABILITIES.has(capability);
  }
  if (["TEACHER", "STAFF"].includes(role)) {
    return LIMITED_REPORT_CAPABILITIES.has(capability);
  }
  return false;
}

export async function getAuthorizedReportTwoCase(
  context: DashboardContext,
  caseId: string,
  capability: ReportTwoCapability,
) {
  if (!roleHasReportTwoCapability(context.user.role, capability)) return null;

  return prisma.caseEntry.findFirst({
    where: {
      id: caseId,
      ...buildCaseEntryReportWhereForUser({
        id: context.user.id,
        role: context.user.role,
        schoolAccountId: context.schoolAccountId,
        email: context.user.email,
      }),
    },
    select: {
      id: true,
      schoolAccountId: true,
      createdById: true,
      createdBy: { select: { id: true, role: true, schoolAccountId: true } },
      serviceId: true,
      title: true,
      service: { select: { slug: true, name: true } },
    },
  });
}

export async function getAuthorizedReportTwoById(
  context: DashboardContext,
  reportId: string,
  capability: ReportTwoCapability,
) {
  if (!roleHasReportTwoCapability(context.user.role, capability)) return null;

  const active = await prisma.reportTwoActive.findUnique({
    where: { id: reportId },
  });
  if (active) {
    if (context.user.role === "PRINCIPAL") {
      const returned = await prisma.internalAssignment.findFirst({
        where: {
          reportSnapshotId: reportId,
          schoolAccountId: context.schoolAccountId || "__NO_SCHOOL__",
          createdById: context.user.id,
          status: { in: ["SUBMITTED", "COMPLETED"] },
        },
        select: { id: true },
      });
      if (returned) {
        const caseEntry = await prisma.caseEntry.findFirst({
          where: {
            id: active.caseEntryId,
            schoolAccountId: context.schoolAccountId || "__NO_SCHOOL__",
          },
          select: {
            id: true,
            schoolAccountId: true,
            serviceId: true,
            title: true,
            service: { select: { slug: true, name: true } },
          },
        });
        if (caseEntry && caseEntry.schoolAccountId === active.schoolAccountId) {
          return { kind: "ACTIVE" as const, report: active, caseEntry };
        }
      }
    }

    const caseEntry = await getAuthorizedReportTwoCase(
      context,
      active.caseEntryId,
      capability,
    );
    return caseEntry && caseEntry.schoolAccountId === active.schoolAccountId
      ? { kind: "ACTIVE" as const, report: active, caseEntry }
      : null;
  }

  const snapshot = await prisma.reportSnapshot.findUnique({
    where: { id: reportId },
  });
  if (!snapshot) return null;

  if (context.user.role === "PRINCIPAL") {
    const returned = await prisma.internalAssignment.findFirst({
      where: {
        reportSnapshotId: reportId,
        schoolAccountId: context.schoolAccountId || "__NO_SCHOOL__",
        createdById: context.user.id,
        status: { in: ["SUBMITTED", "COMPLETED"] },
      },
      select: { id: true },
    });
    if (returned) {
      const caseEntry = await prisma.caseEntry.findFirst({
        where: {
          id: snapshot.caseEntryId,
          schoolAccountId: context.schoolAccountId || "__NO_SCHOOL__",
        },
        select: {
          id: true,
          schoolAccountId: true,
          serviceId: true,
          title: true,
          service: { select: { slug: true, name: true } },
        },
      });
      if (
        caseEntry &&
        (!snapshot.schoolAccountId || snapshot.schoolAccountId === caseEntry.schoolAccountId)
      ) {
        return { kind: "SNAPSHOT" as const, report: snapshot, caseEntry };
      }
    }
  }

  const caseEntry = await getAuthorizedReportTwoCase(
    context,
    snapshot.caseEntryId,
    capability,
  );
  return caseEntry &&
    (!snapshot.schoolAccountId ||
      snapshot.schoolAccountId === caseEntry.schoolAccountId)
    ? { kind: "SNAPSHOT" as const, report: snapshot, caseEntry }
    : null;
}
