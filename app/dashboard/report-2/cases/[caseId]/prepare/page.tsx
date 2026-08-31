import { notFound, redirect } from "next/navigation";

import { ReportPrepareFlow } from "@/components/report-flow/report-prepare-flow";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { buildSmartReportPayloadForCase } from "@/lib/report-engine/smart-report-payload-builder";
import {
  reportVariants,
  resolveReportVariantId,
} from "@/lib/report-engine/report-variant-registry";
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

export default async function ReportTwoPreparePage({
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

  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const caseId = String(resolvedParams.caseId || "").trim();
  const requestedVariant = firstParam(resolvedSearchParams.variant);

  const result = await buildSmartReportPayloadForCase({
    caseId,
    current,
    historicalPersonalRead: true,
  });

  if (!result.ok) {
    notFound();
  }

  const selectedVariantId = resolveReportVariantId(
    requestedVariant ||
      (result.serviceSlug === "custom-report" ? "smart-general-a4" : undefined),
  );

  if (current.user.role !== "ADMIN" && result.serviceSlug !== "custom-report") {
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

  if (result.serviceSlug === "activity-programs-school-broadcast") {
    redirect(
      `/dashboard/report-2/cases/${encodeURIComponent(caseId)}/studio?${new URLSearchParams({
        mode: "preview",
        variant: selectedVariantId,
      }).toString()}`,
    );
  }

  const continueHref = `/dashboard/report-2/cases/${encodeURIComponent(caseId)}/studio?${new URLSearchParams({
    mode: "preview",
    variant: selectedVariantId,
  }).toString()}`;

  return (
    <ReportPrepareFlow
      payload={result.payload}
      selectedVariantId={selectedVariantId}
      variants={reportVariants}
      continueHref={continueHref}
    />
  );
}
