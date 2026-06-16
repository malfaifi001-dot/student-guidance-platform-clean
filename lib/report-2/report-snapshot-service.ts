import "server-only";

import { prisma } from "@/lib/prisma";
import type { DashboardContext } from "@/lib/auth/dashboard-context";
import { canAccessSchool } from "@/lib/auth/dashboard-context";

type JsonValue = unknown;

type CreateReportTwoSnapshotInput = {
  caseId: string;
  reportTitle?: string;
  templateId?: string | null;
  templateName?: string | null;
  variantId?: string | null;
  snapshotPayload: JsonValue;
  snapshotTemplateJson?: JsonValue;
  snapshotPagesJson?: JsonValue;
  snapshotHtml: string;
  pdfUrl?: string | null;
};

function cleanString(value: unknown, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function toNullableString(value: unknown) {
  const text = cleanString(value);
  return text || null;
}

function toPrismaJson(value: unknown, fallback: unknown = null) {
  if (value === undefined) return fallback;

  try {
    return JSON.parse(
      JSON.stringify(value, (_key, item) =>
        item === undefined ? null : item,
      ),
    );
  } catch {
    return fallback;
  }
}

function serializeSnapshot(snapshot: any) {
  return {
    id: snapshot.id,
    caseEntryId: snapshot.caseEntryId,
    schoolAccountId: snapshot.schoolAccountId,
    serviceSlug: snapshot.serviceSlug,
    serviceName: snapshot.serviceName,
    reportTitle: snapshot.reportTitle,
    templateId: snapshot.templateId,
    templateName: snapshot.templateName,
    variantId: snapshot.variantId,
    snapshotPayload: snapshot.snapshotPayload,
    snapshotTemplateJson: snapshot.snapshotTemplateJson,
    snapshotPagesJson: snapshot.snapshotPagesJson,
    snapshotHtml: snapshot.snapshotHtml,
    pdfUrl: snapshot.pdfUrl,
    approvedById: snapshot.approvedById,
    approvedByName: snapshot.approvedByName,
    approvedAt: snapshot.approvedAt?.toISOString?.() || snapshot.approvedAt,
    createdAt: snapshot.createdAt?.toISOString?.() || snapshot.createdAt,
    updatedAt: snapshot.updatedAt?.toISOString?.() || snapshot.updatedAt,
  };
}

export async function createReportTwoSnapshot(
  context: DashboardContext,
  input: CreateReportTwoSnapshotInput,
) {
  const caseEntry = await prisma.caseEntry.findFirst({
    where: context.isAdmin
      ? {
          id: input.caseId,
        }
      : {
          id: input.caseId,
          schoolAccountId: context.schoolAccountId || "__missing__",
        },
    include: {
      service: {
        select: {
          slug: true,
          name: true,
        },
      },
    },
  });

  if (!caseEntry || !canAccessSchool(context, caseEntry.schoolAccountId)) {
    return {
      ok: false as const,
      status: 404,
      message: "الحالة غير موجودة أو لا تملك صلاحية الوصول إليها.",
    };
  }

  const snapshotHtml = cleanString(input.snapshotHtml);

  if (!snapshotHtml) {
    return {
      ok: false as const,
      status: 400,
      message: "لا يمكن اعتماد التقرير قبل تجهيز معاينة ثابتة.",
    };
  }

  const reportTitle =
    cleanString(input.reportTitle) ||
    cleanString(caseEntry.title) ||
    cleanString(caseEntry.service?.name, "تقرير معتمد");

  const snapshot = await prisma.reportSnapshot.create({
    data: {
      caseEntryId: caseEntry.id,
      schoolAccountId: caseEntry.schoolAccountId,
      serviceSlug: caseEntry.service?.slug || null,
      serviceName: caseEntry.service?.name || null,
      reportTitle,
      templateId: toNullableString(input.templateId),
      templateName: toNullableString(input.templateName),
      variantId: toNullableString(input.variantId),
      snapshotPayload: toPrismaJson(input.snapshotPayload, {}) as any,
      snapshotTemplateJson: toPrismaJson(input.snapshotTemplateJson, null) as any,
      snapshotPagesJson: toPrismaJson(input.snapshotPagesJson, null) as any,
      snapshotHtml,
      pdfUrl: toNullableString(input.pdfUrl),
      approvedById: context.user.id,
      approvedByName: toNullableString(context.user.name) || context.user.email,
    },
  });

  return {
    ok: true as const,
    snapshot: serializeSnapshot(snapshot),
  };
}

export async function listReportTwoSnapshots(context: DashboardContext) {
  const snapshots = await prisma.reportSnapshot.findMany({
    where: context.isAdmin
      ? {}
      : {
          schoolAccountId: context.schoolAccountId || "__missing__",
        },
    orderBy: {
      approvedAt: "desc",
    },
    take: 100,
  });

  return snapshots.map(serializeSnapshot);
}

export async function getReportTwoSnapshotById(
  context: DashboardContext,
  snapshotId: string,
) {
  const snapshot = await prisma.reportSnapshot.findFirst({
    where: context.isAdmin
      ? {
          id: snapshotId,
        }
      : {
          id: snapshotId,
          schoolAccountId: context.schoolAccountId || "__missing__",
        },
  });

  return snapshot ? serializeSnapshot(snapshot) : null;
}
