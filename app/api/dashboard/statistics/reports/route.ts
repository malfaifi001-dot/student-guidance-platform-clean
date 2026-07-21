import { NextResponse } from "next/server";

import {
  requireActiveSubscriptionForCurrentUser,
} from "@/bin/require-auth";

import {
  requireDashboardApiContext,
} from "@/lib/auth/dashboard-context";

import {
  requireStatisticsRole,
} from "@/lib/statistics/statistics-access";

import {
  listStatisticsReports,
} from "@/lib/statistics/statistics-report-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const context =
    await requireDashboardApiContext();

  if (context instanceof NextResponse) {
    return context;
  }

  const roleGuard =
    requireStatisticsRole(context);

  if (roleGuard) {
    return roleGuard;
  }

  const subscriptionResult =
    await requireActiveSubscriptionForCurrentUser();

  if (
    subscriptionResult instanceof Response
  ) {
    return subscriptionResult;
  }

  const reports =
    await listStatisticsReports(
      context,
    );

  return NextResponse.json({
    success: true,
    reports,
  });
}