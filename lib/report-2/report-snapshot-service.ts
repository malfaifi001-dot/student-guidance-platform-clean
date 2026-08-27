import "server-only";

import { prisma } from "@/lib/prisma";
import type { DashboardContext } from "@/lib/auth/dashboard-context";
import { canAccessSchool } from "@/lib/auth/dashboard-context";
import {
  getAuthorizedReportTwoById,
  getAuthorizedReportTwoCase,
} from "@/lib/report-2/report-two-access";
import {
  buildReportTwoPreviewCase,
  buildReportTwoRenderContext,
} from "@/lib/report-2/report-two-structured-data";
import { buildCaseEntryReportWhereForUser } from "@/lib/report-engine/report-access-scope";
import { resolvePrincipalSignatureForReport } from "@/lib/report-signatures/principal-signature-resolver";
import {
  clearPrincipalSignatureFromHtml,
  applyPrincipalSignatureToHtml,
} from "@/lib/report-signatures/principal-signature-html";
import { reconcilePrincipalSignaturePayload } from "@/lib/report-signatures/report-two-signature";
import type { SmartReportPayload } from "@/lib/report-engine/smart-report-types";

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
  editorState?: JsonValue;
  approvedEditConfirmed?: boolean;
};

type SaveReportTwoInput = CreateReportTwoSnapshotInput & {
  expectedVersion?: number | null;
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
      JSON.stringify(value, (_key, item) => (item === undefined ? null : item)),
    );
  } catch {
    return fallback;
  }
}

function serializeSnapshot(snapshot: any) {
  const payload = snapshot.snapshotPayload || {};
  return {
    id: snapshot.id,
    caseEntryId: snapshot.caseEntryId,
    schoolAccountId: snapshot.schoolAccountId,
    serviceSlug: snapshot.serviceSlug,
    serviceName: snapshot.serviceName,
    status: "APPROVED" as const,
    reportTitle: snapshot.reportTitle,
    templateId: snapshot.templateId,
    templateName: snapshot.templateName,
    variantId: snapshot.variantId,
    snapshotPayload: snapshot.snapshotPayload,
    snapshotTemplateJson: snapshot.snapshotTemplateJson,
    snapshotPagesJson: snapshot.snapshotPagesJson,
    snapshotHtml: snapshot.snapshotHtml,
    renderContext: buildReportTwoRenderContext(payload as any),
    previewCase: buildReportTwoPreviewCase(payload as any),
    pdfUrl: snapshot.pdfUrl,
    approvedById: snapshot.approvedById,
    approvedByName: snapshot.approvedByName,
    approvedAt: snapshot.approvedAt?.toISOString?.() || snapshot.approvedAt,
    createdAt: snapshot.createdAt?.toISOString?.() || snapshot.createdAt,
    updatedAt: snapshot.updatedAt?.toISOString?.() || snapshot.updatedAt,
  };
}

function serializeActiveReport(report: any) {
  return {
    id: report.id,
    caseEntryId: report.caseEntryId,
    schoolAccountId: report.schoolAccountId,
    serviceSlug: report.serviceSlug,
    serviceName: report.serviceName,
    status: report.status,
    reportTitle: report.reportTitle,
    templateId: report.templateId,
    templateName: report.templateName,
    variantId: report.variantId,
    snapshotPayload: report.sourcePayload,
    snapshotTemplateJson: report.templateJson,
    snapshotPagesJson: report.pagesJson,
    snapshotHtml: report.renderedHtml,
    renderContext: report.renderContext,
    previewCase: report.previewCase,
    editorState: report.editorState,
    pdfUrl: report.pdfUrl,
    approvedById: report.approvedById,
    approvedByName: report.approvedByName,
    approvedAt: report.approvedAt?.toISOString?.() || report.approvedAt,
    savedAt: report.savedAt?.toISOString?.() || report.savedAt,
    lastSyncedAt: report.lastSyncedAt?.toISOString?.() || report.lastSyncedAt,
    version: report.version,
    createdAt: report.createdAt?.toISOString?.() || report.createdAt,
    updatedAt: report.updatedAt?.toISOString?.() || report.updatedAt,
    active: true,
  };
}

export async function saveReportTwoActive(
  context: DashboardContext,
  input: SaveReportTwoInput,
) {
  const caseEntry = await getAuthorizedReportTwoCase(
    context,
    input.caseId,
    "REPORT_EDIT",
  );
  if (!caseEntry || !canAccessSchool(context, caseEntry.schoolAccountId)) {
    return {
      ok: false as const,
      status: 404,
      message: "الحالة غير موجودة أو لا تملك صلاحية الوصول إليها.",
    };
  }

  const renderedHtml = cleanString(input.snapshotHtml);
  if (!renderedHtml) {
    return {
      ok: false as const,
      status: 400,
      message: "تعذر حفظ التقرير قبل تجهيز المعاينة.",
    };
  }

  const existing = await prisma.reportTwoActive.findUnique({
    where: { caseEntryId: caseEntry.id },
  });
  if (existing?.status === "APPROVED" && !input.approvedEditConfirmed) {
    return {
      ok: false as const,
      status: 409,
      message: "يلزم تأكيد تعديل التقرير المعتمد.",
    };
  }
  if (
    existing &&
    input.expectedVersion != null &&
    existing.version !== input.expectedVersion
  ) {
    return {
      ok: false as const,
      status: 409,
      message: "تم تحديث التقرير في جلسة أخرى. أعد تحميل الصفحة.",
    };
  }

  const reportTitle =
    cleanString(input.reportTitle) ||
    cleanString(caseEntry.service.name, "تقرير محفوظ");
  const payload = input.snapshotPayload || {};
  const report = await prisma.reportTwoActive.upsert({
    where: { caseEntryId: caseEntry.id },
    create: {
      caseEntryId: caseEntry.id,
      schoolAccountId: caseEntry.schoolAccountId,
      serviceSlug: caseEntry.service.slug,
      serviceName: caseEntry.service.name,
      status: "DRAFT",
      reportTitle,
      templateId: toNullableString(input.templateId),
      templateName: toNullableString(input.templateName),
      variantId: toNullableString(input.variantId),
      sourcePayload: toPrismaJson(payload, {}) as any,
      editorState: toPrismaJson(input.editorState, null) as any,
      templateJson: toPrismaJson(input.snapshotTemplateJson, null) as any,
      pagesJson: toPrismaJson(input.snapshotPagesJson, null) as any,
      renderedHtml,
      renderContext: toPrismaJson(
        buildReportTwoRenderContext(payload as any),
        {},
      ) as any,
      previewCase: toPrismaJson(
        buildReportTwoPreviewCase(payload as any),
        {},
      ) as any,
      pdfUrl: toNullableString(input.pdfUrl),
    },
    update: {
      reportTitle,
      templateId: toNullableString(input.templateId),
      templateName: toNullableString(input.templateName),
      variantId: toNullableString(input.variantId),
      sourcePayload: toPrismaJson(payload, {}) as any,
      editorState: toPrismaJson(input.editorState, null) as any,
      templateJson: toPrismaJson(input.snapshotTemplateJson, null) as any,
      pagesJson: toPrismaJson(input.snapshotPagesJson, null) as any,
      renderedHtml,
      renderContext: toPrismaJson(
        buildReportTwoRenderContext(payload as any),
        {},
      ) as any,
      previewCase: toPrismaJson(
        buildReportTwoPreviewCase(payload as any),
        {},
      ) as any,
      pdfUrl: toNullableString(input.pdfUrl),
      savedAt: new Date(),
      version: { increment: 1 },
    },
  });

  return { ok: true as const, report: serializeActiveReport(report) };
}

export async function createReportTwoSnapshot(
  context: DashboardContext,
  input: CreateReportTwoSnapshotInput,
) {
  const caseEntry = await getAuthorizedReportTwoCase(
    context,
    input.caseId,
    "REPORT_APPROVE",
  );

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

  const existingActive = await prisma.reportTwoActive.findUnique({
    where: { caseEntryId: caseEntry.id },
  });

  const [schoolProfile, signedRequest, selectedStaffAuthorization] = await Promise.all([
    prisma.schoolProfile.findUnique({
      where: { schoolAccountId: caseEntry.schoolAccountId },
      select: {
        schoolAccountId: true,
        principalSignatureUrl: true,
        principalSignatureSignedAt: true,
        principalSignatureReusePolicy: true,
      },
    }),
    existingActive
      ? prisma.reportSignatureRequest.findFirst({
          where: {
            reportTwoActiveId: existingActive.id,
            status: "SIGNED",
            signedAt: { not: null },
            signatureUrl: { not: null },
          },
          orderBy: { signedAt: "desc" },
          select: { status: true, signedAt: true, signatureUrl: true },
        })
      : null,
    caseEntry.createdById
      ? prisma.principalSignatureReuseAuthorization.findUnique({
          where: {
            schoolAccountId_userId: {
              schoolAccountId: caseEntry.schoolAccountId,
              userId: caseEntry.createdById,
            },
          },
          select: { id: true },
        })
      : null,
  ]);
  const effectivePrincipalSignature = resolvePrincipalSignatureForReport({
    schoolIdentity: schoolProfile,
    signLink: signedRequest,
    principalDashboard: existingActive,
    reusePolicy: schoolProfile?.principalSignatureReusePolicy,
    reportOwner: caseEntry.createdById
      ? {
          id: caseEntry.createdById,
          schoolAccountId: caseEntry.createdBy?.schoolAccountId || caseEntry.schoolAccountId,
          role: caseEntry.createdBy?.role,
        }
      : null,
    selectedStaffAuthorized: Boolean(selectedStaffAuthorization),
  });
  const finalSnapshotPayload = reconcilePrincipalSignaturePayload(
    (input.snapshotPayload || {}) as SmartReportPayload,
    effectivePrincipalSignature,
  );
  const finalSnapshotHtml = effectivePrincipalSignature.signatureUrl
    ? applyPrincipalSignatureToHtml(snapshotHtml, effectivePrincipalSignature.signatureUrl)
    : clearPrincipalSignatureFromHtml(snapshotHtml);
  if (existingActive?.status === "APPROVED" && !input.approvedEditConfirmed) {
    return {
      ok: false as const,
      status: 409,
      message: "يلزم تأكيد تعديل التقرير المعتمد.",
    };
  }

  const snapshot =
    existingActive?.status === "APPROVED"
      ? null
      : await prisma.reportSnapshot.create({
          data: {
            caseEntryId: caseEntry.id,
            schoolAccountId: caseEntry.schoolAccountId,
            serviceSlug: caseEntry.service?.slug || null,
            serviceName: caseEntry.service?.name || null,
            reportTitle,
            templateId: toNullableString(input.templateId),
            templateName: toNullableString(input.templateName),
            variantId: toNullableString(input.variantId),
            snapshotPayload: toPrismaJson(finalSnapshotPayload, {}) as any,
            snapshotTemplateJson: toPrismaJson(
              input.snapshotTemplateJson,
              null,
            ) as any,
            snapshotPagesJson: toPrismaJson(
              input.snapshotPagesJson,
              null,
            ) as any,
            snapshotHtml: finalSnapshotHtml,
            pdfUrl: toNullableString(input.pdfUrl),
            approvedById: context.user.id,
            approvedByName:
              toNullableString(context.user.name) || context.user.email,
          },
        });

  const activeId = existingActive?.id || snapshot!.id;
  const approvedAt = existingActive?.approvedAt || snapshot!.approvedAt;
  const active = await prisma.reportTwoActive.upsert({
    where: { caseEntryId: caseEntry.id },
    create: {
      id: activeId,
      caseEntryId: caseEntry.id,
      schoolAccountId: caseEntry.schoolAccountId,
      serviceSlug: caseEntry.service.slug,
      serviceName: caseEntry.service.name,
      status: "APPROVED",
      reportTitle,
      templateId: toNullableString(input.templateId),
      templateName: toNullableString(input.templateName),
      variantId: toNullableString(input.variantId),
      sourcePayload: toPrismaJson(finalSnapshotPayload, {}) as any,
      editorState: toPrismaJson(input.editorState, null) as any,
      templateJson: toPrismaJson(input.snapshotTemplateJson, null) as any,
      pagesJson: toPrismaJson(input.snapshotPagesJson, null) as any,
      renderedHtml: finalSnapshotHtml,
      renderContext: toPrismaJson(
        buildReportTwoRenderContext(finalSnapshotPayload as any),
        {},
      ) as any,
      previewCase: toPrismaJson(
        buildReportTwoPreviewCase(finalSnapshotPayload as any),
        {},
      ) as any,
      pdfUrl: toNullableString(input.pdfUrl),
      approvedById: context.user.id,
      approvedByName: toNullableString(context.user.name) || context.user.email,
      approvedAt,
    },
    update: {
      status: "APPROVED",
      reportTitle,
      templateId: toNullableString(input.templateId),
      templateName: toNullableString(input.templateName),
      variantId: toNullableString(input.variantId),
      sourcePayload: toPrismaJson(finalSnapshotPayload, {}) as any,
      editorState: toPrismaJson(input.editorState, null) as any,
      templateJson: toPrismaJson(input.snapshotTemplateJson, null) as any,
      pagesJson: toPrismaJson(input.snapshotPagesJson, null) as any,
      renderedHtml: finalSnapshotHtml,
      renderContext: toPrismaJson(
        buildReportTwoRenderContext(finalSnapshotPayload as any),
        {},
      ) as any,
      previewCase: toPrismaJson(
        buildReportTwoPreviewCase(finalSnapshotPayload as any),
        {},
      ) as any,
      pdfUrl: toNullableString(input.pdfUrl),
      version: { increment: 1 },
    },
  });

  return {
    ok: true as const,
    snapshot: serializeActiveReport(active),
  };
}

export async function listReportTwoSnapshots(context: DashboardContext) {
  const allowedCases = await prisma.caseEntry.findMany({
    where: buildCaseEntryReportWhereForUser({
      id: context.user.id,
      role: context.user.role,
      schoolAccountId: context.schoolAccountId,
      email: context.user.email,
    }),
    select: { id: true, title: true },
    take: 500,
  });
  const allowedCaseIds = allowedCases.map((item) => item.id);
  const caseTitleById = new Map(
    allowedCases.map((item) => [item.id, item.title || "الحالة"]),
  );
  const activeReports = await prisma.reportTwoActive.findMany({
    where: { caseEntryId: { in: allowedCaseIds } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const snapshots = await prisma.reportSnapshot.findMany({
    where: { caseEntryId: { in: allowedCaseIds } },
    orderBy: { approvedAt: "desc" },
    take: 100,
  });

  const activeIds = new Set(activeReports.map((item) => item.id));
  return [
    ...activeReports.map((report) => ({
      ...serializeActiveReport(report),
      caseTitle: caseTitleById.get(report.caseEntryId) || "الحالة",
    })),
    ...snapshots
      .filter((item) => !activeIds.has(item.id))
      .map((snapshot) => ({
        ...serializeSnapshot(snapshot),
        caseTitle: caseTitleById.get(snapshot.caseEntryId) || "الحالة",
      })),
  ];
}

export async function getReportTwoSnapshotById(
  context: DashboardContext,
  snapshotId: string,
) {
  const result = await getAuthorizedReportTwoById(
    context,
    snapshotId,
    "REPORT_VIEW",
  );
  if (!result) return null;
  return result.kind === "ACTIVE"
    ? serializeActiveReport(result.report)
    : serializeSnapshot(result.report);
}

export async function getLatestReportTwoSnapshotForCase(
  context: DashboardContext,
  caseId: string,
) {
  const active = await prisma.reportTwoActive.findFirst({
    where: context.isAdmin
      ? { caseEntryId: caseId }
      : {
          caseEntryId: caseId,
          schoolAccountId: context.schoolAccountId || "__missing__",
        },
  });
  if (active) return serializeActiveReport(active);

  const snapshot = await prisma.reportSnapshot.findFirst({
    where: context.isAdmin
      ? {
          caseEntryId: caseId,
        }
      : {
          caseEntryId: caseId,
          schoolAccountId: context.schoolAccountId || "__missing__",
        },
    orderBy: {
      approvedAt: "desc",
    },
  });

  return snapshot ? serializeSnapshot(snapshot) : null;
}

export async function listLatestReportTwoSnapshotsForCases(
  context: DashboardContext,
  caseIds: string[],
) {
  if (!caseIds.length) {
    return new Map<
      string,
      {
        id: string;
        status: "DRAFT" | "APPROVED";
        approvedAt: string | null;
        createdAt: string;
        reportTitle: string;
      }
    >();
  }

  const activeReports = await prisma.reportTwoActive.findMany({
    where: context.isAdmin
      ? { caseEntryId: { in: caseIds } }
      : {
          caseEntryId: { in: caseIds },
          schoolAccountId: context.schoolAccountId || "__missing__",
        },
    orderBy: { updatedAt: "desc" },
  });
  const coveredCaseIds = new Set(activeReports.map((item) => item.caseEntryId));
  const snapshots = await prisma.reportSnapshot.findMany({
    where: context.isAdmin
      ? {
          caseEntryId: { in: caseIds },
        }
      : {
          caseEntryId: { in: caseIds },
          schoolAccountId: context.schoolAccountId || "__missing__",
        },
    orderBy: {
      approvedAt: "desc",
    },
  });

  const map = new Map<
    string,
    {
      id: string;
      status: "DRAFT" | "APPROVED";
      approvedAt: string | null;
      createdAt: string;
      reportTitle: string;
    }
  >();

  for (const report of activeReports) {
    map.set(report.caseEntryId, {
      id: report.id,
      status: report.status,
      approvedAt: report.approvedAt?.toISOString() || null,
      createdAt: report.createdAt.toISOString(),
      reportTitle: report.reportTitle,
    });
  }

  for (const snapshot of snapshots) {
    if (
      !coveredCaseIds.has(snapshot.caseEntryId) &&
      !map.has(snapshot.caseEntryId)
    ) {
      map.set(snapshot.caseEntryId, {
        id: snapshot.id,
        status: "APPROVED",
        approvedAt:
          snapshot.approvedAt?.toISOString?.() ||
          (snapshot.approvedAt ? String(snapshot.approvedAt) : null),
        createdAt:
          snapshot.createdAt?.toISOString?.() || String(snapshot.createdAt),
        reportTitle: snapshot.reportTitle,
      });
    }
  }

  return map;
}
