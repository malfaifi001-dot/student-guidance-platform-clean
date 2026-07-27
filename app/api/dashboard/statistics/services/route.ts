import { NextResponse } from "next/server";

import {
  requireActiveSubscriptionForCurrentUser,
} from "@/bin/require-auth";
import { requireDashboardApiContext } from "@/lib/auth/dashboard-context";
import { requireStatisticsRole } from "@/lib/statistics/statistics-access";
import {
  listIssuedReportSources,
} from "@/lib/statistics/statistics-issued-report-source";
import { listAllowedStatisticsServices } from "@/lib/statistics/statistics-service-selection";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await requireDashboardApiContext();

  if (context instanceof NextResponse) {
    return context;
  }

  const roleGuard = requireStatisticsRole(context);

  if (roleGuard) {
    return roleGuard;
  }

  if (!context.isAdmin && !context.schoolAccountId) {
    return NextResponse.json(
      {
        success: false,
        error: "لم يتم ربط الحساب بمدرسة.",
        code: "SCHOOL_ACCOUNT_REQUIRED",
      },
      {
        status: 403,
      },
    );
  }

  if (!context.isAdmin) {
    const subscriptionResult = await requireActiveSubscriptionForCurrentUser();
    if (subscriptionResult instanceof Response) return subscriptionResult;
  }

  const issuedSources =
    await listIssuedReportSources(context);

  const availableServices = await listAllowedStatisticsServices(context);
  const allowedSlugs = new Set(availableServices.map((service) => service.slug));

  const allowedSources = issuedSources.filter(
    (source) => allowedSlugs.has(source.serviceSlug),
  );
  const services = availableServices.map((service) => {
    const sources = allowedSources.filter((source) => source.serviceSlug === service.slug);
    return {
      ...service,
      eligibleCaseCount: new Set(sources.map((source) => source.caseEntryId)).size,
      issuedReportCount: new Set(sources.map((source) => source.normalizedId)).size,
    };
  });

  return NextResponse.json({
    success: true,
    services,
    totals: {
      eligibleCaseCount: new Set(
        allowedSources.map(
          (source) => source.caseEntryId,
        ),
      ).size,
      issuedReportCount: new Set(
        allowedSources.map(
          (source) => source.normalizedId,
        ),
      ).size,
    },
  });
}
