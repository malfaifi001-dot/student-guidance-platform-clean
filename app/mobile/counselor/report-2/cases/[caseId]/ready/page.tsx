import { notFound, redirect } from "next/navigation";

import { MobileReportReadyPage } from "@/components/mobile/mobile-report-ready-page";
import type { MobileReportTemplateOption } from "@/components/mobile/mobile-report-prepare-flow";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { getLatestReportTwoSnapshotForCase } from "@/lib/report-2/report-snapshot-service";
import { buildSmartReportPayloadForCase } from "@/lib/report-engine/smart-report-payload-builder";
import { resolveReportVariantId } from "@/lib/report-engine/report-variant-registry";
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

async function loadTemplateOptions(
  serviceSlug: string,
): Promise<MobileReportTemplateOption[]> {
  const templatesRaw = await prisma.reportTemplate.findMany({
    where: {
      isActive: true,
      OR: [{ serviceSlug: null }, { serviceSlug }],
    },
    orderBy: [{ serviceSlug: "desc" }, { updatedAt: "desc" }],
    take: 30,
  });

  return templatesRaw
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
}

export default async function MobileReportTwoReadyPage({
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
    );

    if (!overview.usable) {
      redirect("/dashboard/plans?reason=activation-required");
    }
  }

  const { caseId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedVariantId = resolveReportVariantId(
    firstParam(resolvedSearchParams.variant),
  );

  const result = await buildSmartReportPayloadForCase({
    caseId,
    current,
  });

  if (!result.ok) {
    notFound();
  }

  if (current.user.role !== "ADMIN") {
    const access = await isServiceAllowedForSchool({
      schoolAccountId: current.user.schoolAccountId || "",
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

  const templates = await loadTemplateOptions(result.serviceSlug);
  const selectedTemplateId = String(
    firstParam(resolvedSearchParams.templateId) || templates[0]?.id || "",
  );
  const snapshot = await getLatestReportTwoSnapshotForCase(
    {
      user: {
        id: current.user.id,
        name: current.user.name || null,
        email: current.user.email,
        role: current.user.role,
        schoolAccountId: current.user.schoolAccountId || null,
      },
      isAdmin: current.user.role === "ADMIN",
      schoolAccountId: current.user.schoolAccountId || null,
    },
    caseId,
  );

  return (
    <MobileReportReadyPage
      caseId={caseId}
      payload={result.payload}
      selectedVariantId={selectedVariantId}
      templates={templates}
      selectedTemplateId={selectedTemplateId}
      approvedSnapshot={
        snapshot
          ? {
              id: snapshot.id,
              previewUrl: `/dashboard/report-2/snapshots/${encodeURIComponent(snapshot.id)}/preview`,
            }
          : null
      }
    />
  );
}
