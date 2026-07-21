import { NextResponse } from "next/server";

import {
  requireActiveSubscriptionForCurrentUser,
  requireServiceAccessForCurrentUser,
} from "@/bin/require-auth";
import { requireDashboardApiContext } from "@/lib/auth/dashboard-context";
import { requireStatisticsRole } from "@/lib/statistics/statistics-access";
import {
  buildStatisticsServiceOptions,
  listIssuedReportSources,
} from "@/lib/statistics/statistics-issued-report-source";

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

  const subscriptionResult =
    await requireActiveSubscriptionForCurrentUser();

  if (subscriptionResult instanceof Response) {
    return subscriptionResult;
  }

  const issuedSources =
    await listIssuedReportSources(context);

  const discoveredServices =
    buildStatisticsServiceOptions(issuedSources);

  const allowedServices = [];

  for (const service of discoveredServices) {
    const accessResult =
      await requireServiceAccessForCurrentUser(
        service.slug,
      );

    if (!(accessResult instanceof Response)) {
      allowedServices.push(service);
    }
  }

  const allowedSlugs = new Set(
    allowedServices.map((service) => service.slug),
  );

  const allowedSources = issuedSources.filter(
    (source) => allowedSlugs.has(source.serviceSlug),
  );

  return NextResponse.json({
    success: true,
    services: allowedServices,
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