import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma, UserRole } from "@prisma/client";

import { ensureDashboardWorkflowService } from "@/lib/admin/workflows/ensure-dashboard-workflow-services";
import { requirePrincipalPage } from "@/lib/principal/principal-page-guard";
import type { PrincipalPerformanceItem } from "@/lib/principal/performance-items";
import { prisma } from "@/lib/prisma";
import {
  requireActiveSubscriptionForCurrentUser,
  requireServiceAccessForCurrentUser,
} from "@/lib/subscription/subscription-guard";

export const INTERNAL_ASSIGNMENT_ASSIGNEE_ROLES = [
  "TEACHER",
  "ACTIVITY_LEADER",
  "COUNSELOR",
] as const satisfies readonly UserRole[];

export type SimplePerformanceRowInput = {
  title: string;
  value: string;
};

export type PrincipalServiceDefinition = {
  serviceSlug: string;
};

function clean(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export function normalizeSimplePerformanceRows(input: unknown) {
  if (!Array.isArray(input)) return [];

  return input
    .slice(0, 30)
    .map((row) => {
      const record = row && typeof row === "object"
        ? (row as Record<string, unknown>)
        : {};
      return {
        title: clean(record.title, 180),
        value: clean(record.value, 5000),
      };
    })
    .filter((row) => row.title || row.value);
}

export async function requirePrincipalServicePageAccess(
  serviceDefinition: PrincipalServiceDefinition,
) {
  const principal = await requirePrincipalPage();
  await ensureDashboardWorkflowService(serviceDefinition.serviceSlug);
  await requireActiveSubscriptionForCurrentUser();
  await requireServiceAccessForCurrentUser(serviceDefinition.serviceSlug);

  const service = await prisma.service.findUniqueOrThrow({
    where: { slug: serviceDefinition.serviceSlug },
  });

  return { ...principal, service };
}

export function requirePrincipalPerformancePageAccess(
  performanceItem: PrincipalPerformanceItem,
) {
  return requirePrincipalServicePageAccess(performanceItem);
}

export async function getPrincipalServicePageData(
  serviceDefinition: PrincipalServiceDefinition,
) {
  const context = await requirePrincipalServicePageAccess(serviceDefinition);
  const schoolAccountId = context.schoolAccountId as string;

  const [entries, assignments, members] = await Promise.all([
    prisma.caseEntry.findMany({
      where: {
        schoolAccountId,
        serviceId: context.service.id,
        createdById: context.user.id,
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        status: true,
        workflowId: true,
        createdAt: true,
        updatedAt: true,
        values: {
          orderBy: { createdAt: "asc" },
          select: { fieldKey: true, value: true },
        },
        _count: { select: { values: true, guidanceReports: true } },
      },
    }),
    prisma.internalAssignment.findMany({
      where: {
        schoolAccountId,
        createdById: context.user.id,
        originServiceId: context.service.id,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            officialName: true,
            role: true,
            gender: true,
          },
        },
        sourceService: { select: { id: true, slug: true, name: true } },
        guidanceReport: { select: { id: true, title: true } },
        reportSnapshot: { select: { id: true, reportTitle: true } },
      },
    }),
    prisma.user.findMany({
      where: {
        schoolAccountId,
        isActive: true,
        id: { not: context.user.id },
        role: { in: [...INTERNAL_ASSIGNMENT_ASSIGNEE_ROLES] },
      },
      orderBy: [{ officialName: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        officialName: true,
        role: true,
        gender: true,
      },
    }),
  ]);

  return {
    service: context.service,
    entries,
    assignments,
    members,
  };
}

export function getPrincipalPerformancePageData(
  performanceItem: PrincipalPerformanceItem,
) {
  return getPrincipalServicePageData(performanceItem);
}

export async function createSimplePrincipalPerformanceEntry(input: {
  performanceItem: PrincipalPerformanceItem;
  serviceId: string;
  schoolAccountId: string;
  createdById: string;
  rows: SimplePerformanceRowInput[];
}) {
  if (!input.rows.length) {
    throw new Error("أضف حقلًا واحدًا على الأقل قبل الحفظ.");
  }

  if (input.rows.some((row) => !row.title || !row.value)) {
    throw new Error("أكمل العنوان والقيمة في كل صف.");
  }

  const preparedRows = input.rows.map((row, index) => ({
    key: `principal_custom_${index + 1}_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
    title: row.title,
    value: row.value,
  }));
  const now = new Date();
  const workflowSnapshot = {
    kind: "principal-simple-entry",
    version: 1,
    capturedAt: now.toISOString(),
    service: {
      id: input.serviceId,
      slug: input.performanceItem.serviceSlug,
      name: input.performanceItem.title,
    },
    steps: [
      {
        id: "principal-simple-entry",
        title: input.performanceItem.title,
        description: "بيانات عنوان وقيمة أنشأها مدير المدرسة قبل توفر Workflow منشور.",
        order: 0,
        fields: preparedRows.map((row, index) => ({
          id: row.key,
          key: row.key,
          label: row.title,
          type: "TEXT",
          isRequired: true,
          order: index,
          options: [],
        })),
      },
    ],
  } satisfies Prisma.InputJsonObject;

  return prisma.caseEntry.create({
    data: {
      schoolAccountId: input.schoolAccountId,
      serviceId: input.serviceId,
      createdById: input.createdById,
      workflowId: null,
      workflowSnapshot,
      title: preparedRows[0]?.value.slice(0, 180) || input.performanceItem.title,
      status: "SUBMITTED",
      submittedAt: now,
      values: {
        create: preparedRows.map((row) => ({
          fieldKey: row.key,
          value: row.value,
        })),
      },
    },
    select: { id: true },
  });
}

export async function createPrincipalInternalAssignment(input: {
  serviceId: string;
  schoolAccountId: string;
  createdById: string;
  assigneeId: string;
  title?: unknown;
  note?: unknown;
  dueDate?: unknown;
}) {
  const assignee = await prisma.user.findFirst({
    where: {
      id: input.assigneeId,
      schoolAccountId: input.schoolAccountId,
      isActive: true,
      role: { in: [...INTERNAL_ASSIGNMENT_ASSIGNEE_ROLES] },
    },
    select: { id: true },
  });

  if (!assignee) {
    throw new Error("المنسوب المحدد غير متاح في مدرستك.");
  }

  const dueDateText = clean(input.dueDate, 40);
  const dueDate = dueDateText ? new Date(dueDateText) : null;
  if (dueDate && Number.isNaN(dueDate.getTime())) {
    throw new Error("تاريخ التسليم غير صحيح.");
  }

  return prisma.internalAssignment.create({
    data: {
      schoolAccountId: input.schoolAccountId,
      createdById: input.createdById,
      assigneeId: assignee.id,
      originServiceId: input.serviceId,
      title: clean(input.title, 180) || null,
      note: clean(input.note, 3000) || null,
      dueDate,
      status: "PENDING",
    },
    select: { id: true },
  });
}

export function createPrincipalPerformanceAssignment(input: {
  performanceItem: PrincipalPerformanceItem;
  serviceId: string;
  schoolAccountId: string;
  createdById: string;
  assigneeId: string;
  title?: unknown;
  note?: unknown;
  dueDate?: unknown;
}) {
  return createPrincipalInternalAssignment(input);
}
