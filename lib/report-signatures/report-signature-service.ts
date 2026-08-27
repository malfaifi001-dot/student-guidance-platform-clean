import "server-only";

import crypto from "node:crypto";
import { ReportSignatureRequestStatus, type Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  getSchoolSignaturePublicUrl,
  writeSchoolSignatureFile,
} from "@/lib/settings/school-signature-file-storage";
import { processSignatureDataUrl } from "@/lib/signatures/signature-image-processor";
import { resolvePrincipalSignatureForReport } from "@/lib/report-signatures/principal-signature-resolver";
import { recordAuditEvent } from "@/lib/audit/audit-service";

export const REPORT_SIGNATURE_TTL_DAYS = 30;

export function hashReportSignatureToken(token: string) {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export function createReportSignatureToken() {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, tokenHash: hashReportSignatureToken(token) };
}

export function buildReportSignaturePublicUrl(origin: string, token: string) {
  return `${String(origin || "").replace(/\/+$/, "")}/report-signature/${encodeURIComponent(token)}`;
}

export function resolveReportSignaturePublicOrigin(requestUrl: string) {
  const configured = String(
    process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      process.env.SITE_URL ||
      "",
  )
    .trim()
    .replace(/\/+$/, "");

  if (/^https?:\/\//i.test(configured)) return configured;
  return new URL(requestUrl).origin;
}

export function getReportSignatureStatus(input: {
  status: ReportSignatureRequestStatus;
  expiresAt: Date;
}) {
  if (
    input.status === ReportSignatureRequestStatus.PENDING &&
    input.expiresAt.getTime() <= Date.now()
  ) {
    return ReportSignatureRequestStatus.EXPIRED;
  }

  return input.status;
}

export async function expireReportSignatureRequestIfNeeded(request: {
  id: string;
  status: ReportSignatureRequestStatus;
  expiresAt: Date;
}) {
  const status = getReportSignatureStatus(request);

  if (status === ReportSignatureRequestStatus.EXPIRED) {
    await prisma.reportSignatureRequest.updateMany({
      where: {
        id: request.id,
        status: ReportSignatureRequestStatus.PENDING,
        expiresAt: { lte: new Date() },
      },
      data: { status: ReportSignatureRequestStatus.EXPIRED },
    });
  }

  return status;
}

export async function getPublicReportSignatureRequest(token: string) {
  const cleanToken = String(token || "").trim();

  if (!/^[A-Za-z0-9_-]{40,100}$/.test(cleanToken)) {
    return null;
  }

  const request = await prisma.reportSignatureRequest.findUnique({
    where: { tokenHash: hashReportSignatureToken(cleanToken) },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      schoolAccount: { select: { name: true } },
      signedAt: true,
      openedAt: true,
      requesterDisplayName: true,
      principalName: true,
      reportSnapshot: true,
    },
  });

  if (!request) return null;

  const status = await expireReportSignatureRequestIfNeeded(request);
  let openedAt = request.openedAt;
  if (status === ReportSignatureRequestStatus.PENDING && !openedAt) {
    const now = new Date();
    const marked = await prisma.reportSignatureRequest.updateMany({
      where: {
        id: request.id,
        status: ReportSignatureRequestStatus.PENDING,
        openedAt: null,
        expiresAt: { gt: now },
      },
      data: { openedAt: now },
    });
    if (marked.count === 1) openedAt = now;
  }

  return {
    ...request,
    status,
    openedAt,
    reportSnapshot: request.reportSnapshot as Prisma.JsonValue,
  };
}

export async function signReportSignatureRequest(input: {
  token: string;
  dataUrl: string;
  consentToReuse: boolean;
}) {
  const cleanToken = String(input.token || "").trim();
  const tokenHash = hashReportSignatureToken(cleanToken);
  const now = new Date();
  const request = await prisma.reportSignatureRequest.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      schoolAccountId: true,
      reportTwoActiveId: true,
      principalName: true,
      status: true,
      expiresAt: true,
      schoolAccount: { select: { name: true } },
    },
  });

  if (!request) return { ok: false as const, code: "INVALID" as const };

  const status = await expireReportSignatureRequestIfNeeded(request);
  if (status !== ReportSignatureRequestStatus.PENDING) {
    return { ok: false as const, code: status as string };
  }

  if (request.reportTwoActiveId) {
    const [schoolProfile, report] = await Promise.all([
      prisma.schoolProfile.findUnique({
        where: { schoolAccountId: request.schoolAccountId },
        select: {
          schoolAccountId: true,
          principalSignatureUrl: true,
          principalSignatureSignedAt: true,
          principalSignatureReusePolicy: true,
        },
      }),
      prisma.reportTwoActive.findFirst({
        where: {
          id: request.reportTwoActiveId,
          schoolAccountId: request.schoolAccountId,
        },
        select: {
          caseEntryId: true,
          principalSignatureUrl: true,
          principalSignatureSignedAt: true,
          principalSignatureSignedById: true,
        },
      }),
    ]);
    const owner = report?.caseEntryId
      ? await prisma.caseEntry.findUnique({
          where: { id: report.caseEntryId },
          select: { createdById: true, schoolAccountId: true, createdBy: { select: { role: true } } },
        })
      : null;
    const selectedStaffAuthorized = owner?.createdById
      ? Boolean(await prisma.principalSignatureReuseAuthorization.findUnique({
          where: {
            schoolAccountId_userId: {
              schoolAccountId: request.schoolAccountId,
              userId: owner.createdById,
            },
          },
          select: { id: true },
        }))
      : false;
    const effective = resolvePrincipalSignatureForReport({
      schoolIdentity: schoolProfile,
      principalDashboard: report,
      reusePolicy: schoolProfile?.principalSignatureReusePolicy,
      reportOwner: owner?.createdById && owner.createdBy
        ? { id: owner.createdById, schoolAccountId: owner.schoolAccountId, role: owner.createdBy.role }
        : null,
      selectedStaffAuthorized,
    });
    if (effective.status === "SIGNED") {
      return { ok: false as const, code: "SIGNED" as const };
    }
  }

  const signature = await processSignatureDataUrl(input.dataUrl);
  if (!signature) return { ok: false as const, code: "INVALID_SIGNATURE" as const };

  const fileName = `report-principal-signature-${request.id}-${crypto.randomBytes(12).toString("hex")}.png`;
  await writeSchoolSignatureFile(
    request.schoolAccountId,
    fileName,
    new Uint8Array(signature),
  );
  const signatureUrl = getSchoolSignaturePublicUrl(request.schoolAccountId, fileName);

  const result = await prisma.$transaction(async (tx) => {
    const claimed = await tx.reportSignatureRequest.updateMany({
      where: {
        id: request.id,
        tokenHash,
        status: ReportSignatureRequestStatus.PENDING,
        expiresAt: { gt: now },
      },
      data: {
        status: ReportSignatureRequestStatus.SIGNED,
        signatureUrl,
        signedAt: now,
        consentedToReuse: input.consentToReuse,
      },
    });

    if (claimed.count !== 1) return false;

    if (input.consentToReuse) {
      await tx.schoolProfile.upsert({
        where: { schoolAccountId: request.schoolAccountId },
        update: {
          principalName: request.principalName || undefined,
          principalSignatureUrl: signatureUrl,
          principalSignatureSignedAt: now,
        },
        create: {
          schoolAccountId: request.schoolAccountId,
          schoolName: request.schoolAccount.name || "اسم المدرسة",
          principalName: request.principalName || null,
          principalSignatureUrl: signatureUrl,
          principalSignatureSignedAt: now,
        },
      });
    }

    return true;
  });

  if (result) {
    await recordAuditEvent({
      action: "REPORT_SIGNATURE_LINK_SIGNED",
      category: "SIGNATURE",
      status: "SUCCESS",
      schoolAccountId: request.schoolAccountId,
      entityType: "REPORT_SIGNATURE_REQUEST",
      entityId: request.id,
      metadata: {
        reportTwoActiveId: request.reportTwoActiveId || null,
        consentedToReuse: input.consentToReuse,
        source: "SIGN_LINK",
      },
    });
  }

  return result
    ? { ok: true as const, signatureUrl, signedAt: now }
    : { ok: false as const, code: "USED" as const };
}
