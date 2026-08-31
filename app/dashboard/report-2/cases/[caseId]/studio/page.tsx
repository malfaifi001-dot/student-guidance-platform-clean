import { notFound, redirect } from "next/navigation";

import { ReportTwoStudioRuntime } from "@/components/report-2/report-two-studio-runtime";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { buildSmartReportPayloadForCase } from "@/lib/report-engine/smart-report-payload-builder";
import { reconcilePrincipalSignaturePayload } from "@/lib/report-signatures/report-two-signature";
import { getReportSignatureStatus } from "@/lib/report-signatures/report-signature-service";
import { resolvePrincipalSignatureForReport } from "@/lib/report-signatures/principal-signature-resolver";
import { tracePrincipalSignature } from "@/lib/report-signatures/principal-signature-trace";
import {
  getSchoolSubscriptionOverview,
  isServiceAllowedForSchool,
} from "@/lib/subscription/subscription-service";

type PageProps = {
  params: Promise<{
    caseId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseTemplateJson(value: unknown) {
  if (!value) return null;

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

function isVisibleTemplate(templateJson: Record<string, unknown> | null) {
  const status = String(templateJson?.status || "").toUpperCase();

  if (!status) return true;

  return status === "PUBLISHED" || status === "DRAFT";
}

export default async function ReportTwoCaseStudioPage({
  params,
  searchParams,
}: PageProps) {
  const current = await requireDashboardUser();

  if (current.user.role !== "ADMIN") {
    if (!current.user.schoolAccountId) {
      redirect("/dashboard/plans?reason=activation-required");
    }

    const overview = await getSchoolSubscriptionOverview(
      current.user.schoolAccountId,
      current.user.id,
    );

    if (!overview.usable) {
      redirect("/dashboard/plans?reason=activation-required");
    }
  }

  const { caseId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedTemplateId = firstParam(resolvedSearchParams.templateId) || "";
  const selectedVariantId = firstParam(resolvedSearchParams.variant) || "";
  const initialMode =
    firstParam(resolvedSearchParams.mode) === "preview" ? "preview" : "edit";

  const result = await buildSmartReportPayloadForCase({
    caseId,
    current,
    historicalPersonalRead: true,
  });

  if (!result.ok) {
    notFound();
  }
  tracePrincipalSignature({
    stage: "REPORT2_PAGE_BUILDER_RESULT",
    location: "ReportTwoCaseStudioPage",
    details: {
      caseId,
      viewerId: current.user.id,
      viewerRole: current.user.role,
      ownerId: result.reportOwner.id,
      ownerRole: result.reportOwner.role,
      ownerSchoolAccountId: result.reportOwner.schoolAccountId,
    },
    payload: result.payload,
  });

  if (current.user.role !== "ADMIN") {
    const access = await isServiceAllowedForSchool({
      schoolAccountId: current.user.schoolAccountId || "",
      userId: current.user.id,
      serviceSlug: result.serviceSlug,
    });

    if (!access.ok) {
      const reason =
        access.reason === "SUBSCRIPTION_INACTIVE"
          ? "activation-required"
          : "service-not-in-plan";

      redirect(
        `/dashboard/plans?reason=${reason}&service=${encodeURIComponent(
          result.serviceSlug,
        )}`,
      );
    }
  }

  const templatesRaw = await prisma.reportTemplate.findMany({
    where: {
      isActive: true,
      OR: [
        {
          serviceSlug: null,
        },
        {
          serviceSlug: result.serviceSlug,
        },
      ],
    },
    orderBy: [
      {
        serviceSlug: "desc",
      },
      {
        updatedAt: "desc",
      },
    ],
    take: 30,
  });

  const templates = templatesRaw
    .map((template) => {
      const item = template as any;
      const templateJson =
        parseTemplateJson(item.templateJson) || parseTemplateJson(item.content);

      return {
        id: template.id,
        name: template.name,
        description: template.description || "",
        serviceSlug: template.serviceSlug || null,
        updatedAt: template.updatedAt.toISOString(),
        templateJson,
        visible: isVisibleTemplate(templateJson),
      };
    })
    .filter((template) => template.visible)
    .map(({ visible: _visible, ...template }) => template);

  const activeReport = await prisma.reportTwoActive.findFirst({
    where: {
      caseEntryId: caseId,
      ...(current.user.role === "ADMIN"
        ? {}
        : { schoolAccountId: current.user.schoolAccountId || "__missing__" }),
    },
  });

  const isSchoolManager = current.user.role === "PRINCIPAL";

  const [schoolProfile, signatureRequest, signedSignatureRequest, selectedStaffAuthorization] = await Promise.all([
    prisma.schoolProfile.findUnique({
      where: {
        schoolAccountId:
          activeReport?.schoolAccountId || current.user.schoolAccountId || "__missing__",
      },
      select: {
        schoolAccountId: true,
        principalName: true,
        principalPhone: true,
        principalSignatureUrl: true,
        principalSignatureSignedAt: true,
        principalSignatureReusePolicy: true,
      },
    }),
    !isSchoolManager && activeReport
      ? prisma.reportSignatureRequest.findFirst({
          where: { reportTwoActiveId: activeReport.id },
          orderBy: { createdAt: "desc" },
        })
      : null,
    activeReport
      ? prisma.reportSignatureRequest.findFirst({
          where: {
            reportTwoActiveId: activeReport.id,
            status: "SIGNED",
            signedAt: { not: null },
            signatureUrl: { not: null },
          },
          orderBy: { signedAt: "desc" },
        })
      : null,
    result.reportOwner.schoolAccountId
      ? prisma.principalSignatureReuseAuthorization.findUnique({
          where: {
            schoolAccountId_userId: {
              schoolAccountId: result.reportOwner.schoolAccountId,
              userId: result.reportOwner.id,
            },
          },
          select: { id: true },
        })
      : null,
  ]);
  const effectiveRequestStatus = signatureRequest
    ? getReportSignatureStatus(signatureRequest)
    : undefined;
  const effectivePrincipalSignature = resolvePrincipalSignatureForReport({
    schoolIdentity: schoolProfile,
    signLink: signedSignatureRequest,
    principalDashboard: activeReport,
    reusePolicy: schoolProfile?.principalSignatureReusePolicy,
    reportOwner: result.reportOwner,
    selectedStaffAuthorized: Boolean(selectedStaffAuthorization),
  });
  tracePrincipalSignature({
    stage: "REPORT2_PAGE_EFFECTIVE_SIGNATURE",
    location: "ReportTwoCaseStudioPage",
    details: {
      caseId,
      activeReportId: activeReport?.id || null,
      activeReportStatus: activeReport?.status || null,
      policy: schoolProfile?.principalSignatureReusePolicy || "MANUAL_ONLY",
      selectedStaffAuthorized: Boolean(selectedStaffAuthorization),
      signLinkSigned: Boolean(signedSignatureRequest),
      dashboardSignaturePresent: Boolean(activeReport?.principalSignatureUrl),
    },
    signature: effectivePrincipalSignature.signatureUrl,
  });
  // The fresh builder is the canonical base. Reconcile the complete
  // principal-signature state so policy changes cannot leave a stale image in
  // an older active payload.
  const previewPayload = reconcilePrincipalSignaturePayload(
    result.payload,
    effectivePrincipalSignature,
  );
  tracePrincipalSignature({
    stage: "REPORT2_PAGE_RECONCILED_PAYLOAD",
    location: "ReportTwoCaseStudioPage",
    details: { caseId, activeReportId: activeReport?.id || null },
    payload: previewPayload,
  });

  return (
    <ReportTwoStudioRuntime
      caseId={caseId}
      selectedTemplateId={selectedTemplateId}
      selectedVariantId={selectedVariantId}
      initialMode={initialMode}
      payload={previewPayload}
      isSchoolManager={isSchoolManager}
      templates={templates}
      initialPrincipalName={schoolProfile?.principalName || ""}
      initialPrincipalPhone={schoolProfile?.principalPhone || ""}
      initialSignatureRequest={signatureRequest ? {
        id: signatureRequest.id,
        status: effectiveRequestStatus || "PENDING",
        expiresAt: signatureRequest.expiresAt.toISOString(),
        openedAt: signatureRequest.openedAt?.toISOString() || null,
        signedAt: signatureRequest.signedAt?.toISOString() || null,
        signatureUrl: signatureRequest.signatureUrl,
      } : null}
      initialReport={activeReport ? {
        id: activeReport.id,
        status: activeReport.status,
        version: activeReport.version,
        approvedAt: activeReport.approvedAt?.toISOString() || null,
        editorState: activeReport.editorState,
        previewUrl: `/dashboard/report-2/snapshots/${activeReport.id}/preview`,
      } : null}
    />
  );
}
