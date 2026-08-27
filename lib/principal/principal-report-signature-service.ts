import "server-only";

import { ReportSignatureRequestStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { applyPrincipalSignatureToHtml } from "@/lib/report-signatures/principal-signature-html";
import { isPrincipalSignaturePresent } from "@/lib/report-signatures/principal-signature-state";
import { applyExternalPrincipalSignature } from "@/lib/report-signatures/report-two-signature";
import { resolvePrincipalSignatureForReport } from "@/lib/report-signatures/principal-signature-resolver";
import { tracePrincipalSignature } from "@/lib/report-signatures/principal-signature-trace";
import type { PrincipalSignatureReusePolicy } from "@/lib/report-signatures/principal-signature-resolver";
import type { SmartReportPayload } from "@/lib/report-engine/smart-report-types";
import { auditLog } from "@/lib/security/audit";

export type PrincipalStaffReportSource = "GUIDANCE_REPORT" | "REPORT_SNAPSHOT" | "REPORT_TWO";

type PrincipalStaffSignatureStateInput = Parameters<typeof isPrincipalSignaturePresent>[0] & {
  reusePolicy?: PrincipalSignatureReusePolicy | null;
  reportOwner?: { id: string; schoolAccountId?: string | null; role?: string | null } | null;
  selectedStaffAuthorized?: boolean;
};

export function isPrincipalStaffReportSigned(input: PrincipalStaffSignatureStateInput) {
  return resolvePrincipalSignatureForReport({
    schoolIdentity: {
      schoolAccountId: input.reportOwner?.schoolAccountId,
      principalSignatureUrl: input.signatureUrl,
    },
    signLink: input.signedRequest,
    principalDashboard: input.report,
    reusePolicy: input.reusePolicy,
    reportOwner: input.reportOwner,
    selectedStaffAuthorized: input.selectedStaffAuthorized,
  }).status === "SIGNED" || isPrincipalSignaturePresent(input);
}

function applySignatureToReportDataSnapshot(value: unknown, signatureUrl: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const snapshot = { ...(value as Record<string, unknown>) };
  if (snapshot.identity && typeof snapshot.identity === "object") {
    return applyExternalPrincipalSignature(snapshot as SmartReportPayload, signatureUrl);
  }
  if (snapshot.payload && typeof snapshot.payload === "object") {
    snapshot.payload = applyExternalPrincipalSignature(snapshot.payload as SmartReportPayload, signatureUrl);
  }
  if (snapshot.documentDraft && typeof snapshot.documentDraft === "object") {
    const draft = { ...(snapshot.documentDraft as Record<string, unknown>) };
    if (draft.payload && typeof draft.payload === "object") {
      draft.payload = applyExternalPrincipalSignature(draft.payload as SmartReportPayload, signatureUrl);
    }
    snapshot.documentDraft = draft;
  }
  return snapshot;
}

function applySignatureToStoredReportContent(content: string | null, signatureUrl: string) {
  const source = String(content || "");
  try {
    const parsed = JSON.parse(source) as Record<string, unknown>;
    const updated = applySignatureToReportDataSnapshot(parsed, signatureUrl) as Record<string, unknown>;
    return JSON.stringify(updated.documentDraft || updated);
  } catch {
    return applyPrincipalSignatureToHtml(source, signatureUrl);
  }
}

export async function signApprovedPrincipalStaffReport(input: {
  schoolAccountId: string;
  principalUserId: string;
  staffUserId: string;
  source: PrincipalStaffReportSource;
  reportId: string;
}) {
  const profile = await prisma.schoolProfile.findUnique({
    where: { schoolAccountId: input.schoolAccountId },
    select: { principalSignatureUrl: true, principalSignatureReusePolicy: true },
  });
  const signatureUrl = profile?.principalSignatureUrl?.trim();
  if (!signatureUrl) return { ok: false as const, status: 409, error: "يرجى إعداد توقيع مدير المدرسة من إعدادات المدرسة أولًا." };

  const staff = await prisma.user.findFirst({
    where: { id: input.staffUserId, schoolAccountId: input.schoolAccountId, role: { in: ["TEACHER", "COUNSELOR", "ACTIVITY_LEADER"] } },
    select: { id: true, role: true, schoolAccountId: true },
  });
  if (!staff) return { ok: false as const, status: 404, error: "المنسوب غير متاح في هذه المدرسة." };
  const staffCaseIds = (await prisma.caseEntry.findMany({
    where: { schoolAccountId: input.schoolAccountId, createdById: input.staffUserId },
    select: { id: true },
  })).map((item) => item.id);
  if (!staffCaseIds.length) return { ok: false as const, status: 404, error: "لا توجد تقارير صادرة لهذا المنسوب." };

  const selectedStaffAuthorization = await prisma.principalSignatureReuseAuthorization.findUnique({
    where: {
      schoolAccountId_userId: {
        schoolAccountId: input.schoolAccountId,
        userId: input.staffUserId,
      },
    },
    select: { id: true },
  });
  const resolverContext = {
    schoolIdentity: {
      schoolAccountId: input.schoolAccountId,
      principalSignatureUrl: signatureUrl,
    },
    reusePolicy: profile?.principalSignatureReusePolicy,
    reportOwner: {
      id: staff.id,
      schoolAccountId: staff.schoolAccountId,
      role: staff.role,
    },
    selectedStaffAuthorized: Boolean(selectedStaffAuthorization),
  };

  if (resolvePrincipalSignatureForReport({ ...resolverContext }).status === "SIGNED") {
    return { ok: false as const, status: 409, error: "ØªÙ… ØªÙˆÙ‚ÙŠØ¹ Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ù…Ø³Ø¨Ù‚Ù‹Ø§." };
  }

  if (input.source === "REPORT_TWO") {
    const existingRequest = await prisma.reportSignatureRequest.findFirst({
      where: { reportTwoActiveId: input.reportId, status: ReportSignatureRequestStatus.SIGNED, signedAt: { not: null }, signatureUrl: { not: null } },
      select: { id: true },
    });
    if (existingRequest) return { ok: false as const, status: 409, error: "تم توقيع التقرير مسبقًا." };
  }

  const now = new Date();
  const signedData = { principalSignatureUrl: signatureUrl, principalSignatureSignedAt: now, principalSignatureSignedById: input.principalUserId };
  tracePrincipalSignature({
    stage: "PRINCIPAL_DASHBOARD_SIGNATURE_SOURCE",
    location: "signApprovedPrincipalStaffReport",
    details: {
      reportId: input.reportId,
      reportType: input.source,
      staffUserId: input.staffUserId,
      principalUserId: input.principalUserId,
      beforeSignaturePresent: false,
    },
    signature: signatureUrl,
  });
  const result = await prisma.$transaction(async (tx) => {
    if (input.source === "GUIDANCE_REPORT") {
      const report = await tx.guidanceReport.findFirst({
        where: { id: input.reportId, status: { in: ["APPROVED", "ARCHIVED"] }, caseEntry: { schoolAccountId: input.schoolAccountId, createdById: input.staffUserId } },
        select: { id: true, title: true, renderedContent: true, reportDataSnapshot: true, principalSignatureUrl: true, principalSignatureSignedAt: true, principalSignatureSignedById: true, signatureRequests: { where: { status: ReportSignatureRequestStatus.SIGNED, signedAt: { not: null }, signatureUrl: { not: null } }, orderBy: { signedAt: "desc" }, take: 1, select: { status: true, signedAt: true, signatureUrl: true } } },
      });
      if (!report) return { ok: false as const, status: 404, error: "التقرير غير متاح للتوقيع." };
      if (isPrincipalSignaturePresent({ source: input.source, report, signatureUrl, structuredPayload: report.reportDataSnapshot, approvedHtml: report.renderedContent })) return { ok: false as const, status: 409, error: "تم توقيع التقرير مسبقًا." };
      const saved = await tx.guidanceReport.updateMany({ where: { id: report.id, principalSignatureSignedAt: null }, data: { ...signedData, reportDataSnapshot: applySignatureToReportDataSnapshot(report.reportDataSnapshot, signatureUrl) as any, renderedContent: applyPrincipalSignatureToHtml(report.renderedContent, signatureUrl) } });
      if (!saved.count) return { ok: false as const, status: 409, error: "تم توقيع التقرير مسبقًا." };
      return { ok: true as const, title: report.title };
    }

    if (input.source === "REPORT_SNAPSHOT") {
      const report = await tx.reportSnapshot.findFirst({
        where: { id: input.reportId, caseEntryId: { in: staffCaseIds }, OR: [{ schoolAccountId: input.schoolAccountId }, { schoolAccountId: null }] },
        select: { id: true, caseEntryId: true, reportTitle: true, snapshotHtml: true, snapshotPayload: true, principalSignatureUrl: true, principalSignatureSignedAt: true, principalSignatureSignedById: true },
      });
      if (!report) return { ok: false as const, status: 404, error: "التقرير غير متاح للتوقيع." };
      if (isPrincipalSignaturePresent({ source: input.source, report, signatureUrl, structuredPayload: report.snapshotPayload, approvedHtml: report.snapshotHtml })) return { ok: false as const, status: 409, error: "تم توقيع التقرير مسبقًا." };
      const saved = await tx.reportSnapshot.updateMany({ where: { id: report.id, principalSignatureSignedAt: null }, data: { ...signedData, snapshotPayload: applyExternalPrincipalSignature(report.snapshotPayload as SmartReportPayload, signatureUrl) as any, snapshotHtml: applyPrincipalSignatureToHtml(report.snapshotHtml, signatureUrl) } });
      if (!saved.count) return { ok: false as const, status: 409, error: "تم توقيع التقرير مسبقًا." };
      const active = await tx.reportTwoActive.findFirst({
        where: { caseEntryId: report.caseEntryId, status: "APPROVED" },
        select: { id: true, sourcePayload: true, renderedHtml: true },
      });
      if (active) {
        await tx.reportTwoActive.updateMany({
          where: { id: active.id, principalSignatureSignedAt: null },
          data: {
            ...signedData,
            sourcePayload: applyExternalPrincipalSignature(active.sourcePayload as SmartReportPayload, signatureUrl) as any,
            renderedHtml: applyPrincipalSignatureToHtml(active.renderedHtml, signatureUrl),
          },
        });
      }
      return { ok: true as const, title: report.reportTitle };
    }

    const report = await tx.reportTwoActive.findFirst({
      where: { id: input.reportId, schoolAccountId: input.schoolAccountId, status: "APPROVED", caseEntryId: { in: staffCaseIds } },
        select: { id: true, caseEntryId: true, reportTitle: true, renderedHtml: true, sourcePayload: true, principalSignatureUrl: true, principalSignatureSignedAt: true, principalSignatureSignedById: true, signatureRequests: { where: { status: ReportSignatureRequestStatus.SIGNED, signedAt: { not: null }, signatureUrl: { not: null } }, orderBy: { signedAt: "desc" }, take: 1, select: { status: true, signedAt: true, signatureUrl: true } } },
    });
    if (!report) return { ok: false as const, status: 404, error: "التقرير غير متاح للتوقيع." };
    if (isPrincipalSignaturePresent({ source: input.source, report, signatureUrl, structuredPayload: report.sourcePayload, approvedHtml: report.renderedHtml })) return { ok: false as const, status: 409, error: "تم توقيع التقرير مسبقًا." };
    const saved = await tx.reportTwoActive.updateMany({ where: { id: report.id, principalSignatureSignedAt: null }, data: { ...signedData, sourcePayload: applyExternalPrincipalSignature(report.sourcePayload as SmartReportPayload, signatureUrl) as any, renderedHtml: applyPrincipalSignatureToHtml(report.renderedHtml, signatureUrl) } });
    if (!saved.count) return { ok: false as const, status: 409, error: "تم توقيع التقرير مسبقًا." };
    const snapshot = await tx.reportSnapshot.findFirst({
      where: { caseEntryId: report.caseEntryId },
      orderBy: { approvedAt: "desc" },
      select: { id: true, snapshotPayload: true, snapshotHtml: true },
    });
    if (snapshot) {
      await tx.reportSnapshot.updateMany({
        where: { id: snapshot.id, principalSignatureSignedAt: null },
        data: {
          ...signedData,
          snapshotPayload: applyExternalPrincipalSignature(snapshot.snapshotPayload as SmartReportPayload, signatureUrl) as any,
          snapshotHtml: applyPrincipalSignatureToHtml(snapshot.snapshotHtml, signatureUrl),
        },
      });
    }
    return { ok: true as const, title: report.reportTitle };
  });

  if (!result.ok) return result;
  tracePrincipalSignature({
    stage: "PRINCIPAL_DASHBOARD_SIGNATURE_APPLIED",
    location: "signApprovedPrincipalStaffReport",
    details: {
      reportId: input.reportId,
      reportType: input.source,
      signedById: input.principalUserId,
      signedAt: now.toISOString(),
      afterSignaturePresent: true,
    },
    signature: signatureUrl,
  });
  await auditLog({ userId: input.principalUserId, action: "PRINCIPAL_POST_APPROVAL_SIGN", entityType: input.source, entityId: input.reportId, metadata: { schoolAccountId: input.schoolAccountId, staffUserId: input.staffUserId, reportType: input.source, reportTitle: result.title, signatureSource: "school_profile", signedAt: now.toISOString() } });
  return { ok: true as const };
}
