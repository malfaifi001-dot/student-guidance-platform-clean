import "server-only";

import type { DashboardContext, SchoolDashboardContext } from "@/lib/auth/dashboard-context";
import { ACTIVITY_PROGRAM_WORKFLOW_SERVICES } from "@/lib/activity-programs/activity-program-catalog";
import { STUDENT_ACTIVITY_COMPETITIONS_SERVICE } from "@/lib/activity-competitions/activity-competitions-service";
import { COUNSELOR_GUIDANCE_WORKFLOW_SERVICES } from "@/lib/constants/services";
import { prisma } from "@/lib/prisma";
import { listIssuedReportSources } from "@/lib/statistics/statistics-issued-report-source";
import { isServiceAllowedForSchool } from "@/lib/subscription/subscription-service";
import { TEACHER_PERFORMANCE_WORKFLOW_SERVICES } from "@/lib/teacher-performance/teacher-performance-services";

export const INTERNAL_ASSIGNMENT_RECIPIENT_ROLES = [
  "TEACHER",
  "ACTIVITY_LEADER",
  "COUNSELOR",
] as const;

export type InternalAssignmentRecipientRole =
  (typeof INTERNAL_ASSIGNMENT_RECIPIENT_ROLES)[number];

function isRecipientRole(role: string): role is InternalAssignmentRecipientRole {
  return INTERNAL_ASSIGNMENT_RECIPIENT_ROLES.includes(
    role as InternalAssignmentRecipientRole,
  );
}

function getRoleServiceSlugs(role: InternalAssignmentRecipientRole) {
  if (role === "ACTIVITY_LEADER") {
    return [
      ...ACTIVITY_PROGRAM_WORKFLOW_SERVICES.map((service) => service.slug),
      STUDENT_ACTIVITY_COMPETITIONS_SERVICE.slug,
    ];
  }

  if (role === "TEACHER") {
    return [
      ...TEACHER_PERFORMANCE_WORKFLOW_SERVICES.map((service) => service.slug),
      "teacher-report-issuance",
    ];
  }

  return COUNSELOR_GUIDANCE_WORKFLOW_SERVICES.map((service) => service.slug);
}

export async function listInternalAssignmentsForAssignee(
  context: SchoolDashboardContext,
) {
  if (!isRecipientRole(context.user.role)) return [];

  return prisma.internalAssignment.findMany({
    where: {
      schoolAccountId: context.schoolAccountId,
      assigneeId: context.user.id,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      createdBy: { select: { id: true, name: true, officialName: true } },
      originService: { select: { id: true, slug: true, name: true } },
      sourceService: { select: { id: true, slug: true, name: true } },
      guidanceReport: { select: { id: true, title: true } },
      reportSnapshot: { select: { id: true, reportTitle: true } },
    },
  });
}

async function getEligibleReportSelection(context: SchoolDashboardContext) {
  if (!isRecipientRole(context.user.role)) {
    return { services: [], reports: [] };
  }

  const roleServiceSlugs = getRoleServiceSlugs(context.user.role);
  const allowedRoleServices = new Set(roleServiceSlugs);
  const issuedReports = await listIssuedReportSources(
    context as DashboardContext,
  );
  const accessResults = await Promise.all(
    roleServiceSlugs.map(async (serviceSlug) => ({
      serviceSlug,
      access: await isServiceAllowedForSchool({
        schoolAccountId: context.schoolAccountId,
        userId: context.user.id,
        serviceSlug,
      }),
    })),
  );
  const accessibleServiceSlugs = new Set(
    accessResults.filter((result) => result.access.ok).map((result) => result.serviceSlug),
  );
  const serviceRecords = await prisma.service.findMany({
    where: {
      slug: { in: [...accessibleServiceSlugs] },
      status: "ACTIVE",
    },
    select: { id: true, slug: true, name: true },
  });
  const serviceBySlug = new Map(serviceRecords.map((service) => [service.slug, service]));
  const services = roleServiceSlugs
    .map((serviceSlug) => serviceBySlug.get(serviceSlug))
    .filter((service): service is NonNullable<typeof service> => Boolean(service));
  const reports = issuedReports.filter(
    (report) =>
      allowedRoleServices.has(report.serviceSlug) &&
      accessibleServiceSlugs.has(report.serviceSlug),
  );

  return { services, reports };
}

export async function getInternalAssignmentForAssignee(input: {
  context: SchoolDashboardContext;
  assignmentId: string;
  markOpened?: boolean;
}) {
  if (!isRecipientRole(input.context.user.role)) return null;

  const assignment = await prisma.internalAssignment.findFirst({
    where: {
      id: input.assignmentId,
      schoolAccountId: input.context.schoolAccountId,
      assigneeId: input.context.user.id,
    },
    include: {
      createdBy: { select: { id: true, name: true, officialName: true } },
      originService: { select: { id: true, slug: true, name: true } },
    },
  });
  if (!assignment) return null;

  let currentAssignment = assignment;
  if (input.markOpened && assignment.status === "PENDING") {
    currentAssignment = await prisma.internalAssignment.update({
      where: { id: assignment.id },
      data: { status: "OPENED", openedAt: new Date() },
      include: {
        createdBy: { select: { id: true, name: true, officialName: true } },
        originService: { select: { id: true, slug: true, name: true } },
      },
    });
  }

  const { services, reports } = await getEligibleReportSelection(input.context);

  return { assignment: currentAssignment, services, reports };
}

export async function submitInternalAssignmentReport(input: {
  context: SchoolDashboardContext;
  assignmentId: string;
  sourceType: unknown;
  sourceId: unknown;
}) {
  const assignment = await prisma.internalAssignment.findFirst({
    where: {
      id: input.assignmentId,
      schoolAccountId: input.context.schoolAccountId,
      assigneeId: input.context.user.id,
    },
    select: { id: true, status: true },
  });
  if (!assignment) throw new Error("التكليف غير موجود.");
  if (!["PENDING", "OPENED"].includes(assignment.status)) {
    throw new Error("لا يمكن تغيير التقرير بعد تسليم التكليف.");
  }

  const sourceType = String(input.sourceType || "").trim();
  const sourceId = String(input.sourceId || "").trim();
  const { reports } = await getEligibleReportSelection(input.context);
  const selected = reports.find(
    (report) => report.sourceType === sourceType && report.sourceId === sourceId,
  );
  if (!selected) {
    throw new Error("التقرير غير موجود أو لا تملك صلاحية استخدامه.");
  }

  await prisma.internalAssignment.update({
    where: { id: assignment.id },
    data: {
      status: "SUBMITTED",
      openedAt: new Date(),
      submittedAt: new Date(),
      reportType: selected.sourceType,
      guidanceReportId: selected.sourceType === "GUIDANCE_REPORT" ? selected.sourceId : null,
      reportSnapshotId: selected.sourceType === "REPORT_SNAPSHOT" ? selected.sourceId : null,
      sourceServiceId: selected.serviceId,
      reportTitleSnapshot: selected.title,
      sourceServiceSlugSnapshot: selected.serviceSlug,
      sourceServiceNameSnapshot: selected.serviceName,
    },
  });

  return selected;
}
