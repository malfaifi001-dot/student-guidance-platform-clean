import { Prisma, ReportSignatureRequestStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireDashboardApiContext } from "@/lib/auth/dashboard-context";
import { prisma } from "@/lib/prisma";
import { getAuthorizedReportTwoById } from "@/lib/report-2/report-two-access";
import {
  buildReportSignaturePublicUrl,
  createReportSignatureToken,
  getReportSignatureStatus,
  REPORT_SIGNATURE_TTL_DAYS,
  resolveReportSignaturePublicOrigin,
} from "@/lib/report-signatures/report-signature-service";
import type { ReportTwoSignatureSnapshot } from "@/lib/report-signatures/report-two-signature";
import {
  requireActiveSubscriptionApi,
  requireServiceAccessApi,
} from "@/lib/subscription/subscription-api-guard";

type Context = { params: Promise<{ reportId: string }> };

function requestView(request: {
  id: string;
  status: ReportSignatureRequestStatus;
  expiresAt: Date;
  openedAt: Date | null;
  signedAt: Date | null;
  signatureUrl: string | null;
}) {
  return {
    id: request.id,
    status: getReportSignatureStatus(request),
    expiresAt: request.expiresAt.toISOString(),
    openedAt: request.openedAt?.toISOString() || null,
    signedAt: request.signedAt?.toISOString() || null,
    signatureUrl: request.signatureUrl,
  };
}

async function authorizedReport(reportId: string) {
  const auth = await requireDashboardApiContext();
  if (auth instanceof Response) return { response: auth } as const;

  const target = await getAuthorizedReportTwoById(auth, reportId, "REPORT_EDIT");
  if (!target || target.kind !== "ACTIVE") {
    return {
      response: NextResponse.json(
        { success: false, error: "التقرير غير موجود أو لا تملك صلاحية الوصول إليه." },
        { status: 404 },
      ),
    } as const;
  }

  return { auth, report: target.report } as const;
}

export async function GET(_request: Request, context: Context) {
  const { reportId } = await context.params;
  const access = await authorizedReport(reportId);
  if ("response" in access) return access.response;

  const latest = await prisma.reportSignatureRequest.findFirst({
    where: { reportTwoActiveId: access.report.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    request: latest ? requestView(latest) : null,
  });
}

export async function POST(request: Request, context: Context) {
  const subscriptionGuard = await requireActiveSubscriptionApi();
  if (subscriptionGuard) return subscriptionGuard;

  const { reportId } = await context.params;
  const access = await authorizedReport(reportId);
  if ("response" in access) return access.response;

  if (access.auth.user.role === "PRINCIPAL") {
    return NextResponse.json(
      {
        success: false,
        error: "يستخدم مدير المدرسة توقيعه المحفوظ مباشرة في التقارير.",
      },
      { status: 403 },
    );
  }

  const serviceGuard = await requireServiceAccessApi(access.report.serviceSlug || "");
  if (serviceGuard) return serviceGuard;

  const body = await request.json().catch(() => null);
  const principalName = String(body?.principalName || "").trim();
  const principalPhone = String(body?.principalPhone || "").trim();
  const phoneDigits = principalPhone.replace(/\D/g, "");

  if (!principalName || principalName.length > 191) {
    return NextResponse.json(
      { success: false, error: "أدخل اسم المدير." },
      { status: 400 },
    );
  }
  if (phoneDigits.length < 9 || phoneDigits.length > 15) {
    return NextResponse.json(
      { success: false, error: "أدخل رقم جوال صحيحًا." },
      { status: 400 },
    );
  }

  const requester = await prisma.user.findUnique({
    where: { id: access.auth.user.id },
    select: { name: true, officialName: true },
  });
  const requesterDisplayName =
    requester?.officialName || requester?.name || access.auth.user.name || "مستخدم المنصة";
  const school = await prisma.schoolAccount.findUnique({
    where: { id: access.report.schoolAccountId },
    select: { name: true },
  });
  const snapshot = {
    kind: "REPORT_TWO",
    report: {
      template: access.report.templateJson,
      context: (access.report.renderContext || {}) as Record<string, string>,
      previewCase: access.report.previewCase,
      sourcePayload: access.report.sourcePayload,
      variantId: access.report.variantId,
    },
  } satisfies ReportTwoSignatureSnapshot;
  const { token, tokenHash } = createReportSignatureToken();
  const expiresAt = new Date(Date.now() + REPORT_SIGNATURE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const created = await prisma.$transaction(async (tx) => {
    await tx.reportSignatureRequest.updateMany({
      where: {
        reportTwoActiveId: access.report.id,
        status: ReportSignatureRequestStatus.PENDING,
      },
      data: { status: ReportSignatureRequestStatus.CANCELED, canceledAt: new Date() },
    });
    await tx.schoolProfile.upsert({
      where: { schoolAccountId: access.report.schoolAccountId },
      update: { principalName, principalPhone },
      create: {
        schoolAccountId: access.report.schoolAccountId,
        schoolName: school?.name || "اسم المدرسة",
        principalName,
        principalPhone,
      },
    });
    return tx.reportSignatureRequest.create({
      data: {
        reportTwoActiveId: access.report.id,
        schoolAccountId: access.report.schoolAccountId,
        requestedById: access.auth.user.id,
        requesterDisplayName,
        principalName,
        tokenHash,
        expiresAt,
        reportSnapshot: snapshot as Prisma.InputJsonValue,
      },
    });
  });

  return NextResponse.json({
    success: true,
    request: requestView(created),
    publicUrl: buildReportSignaturePublicUrl(
      resolveReportSignaturePublicOrigin(request.url),
      token,
    ),
  });
}
