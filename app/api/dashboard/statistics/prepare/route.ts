import { NextResponse } from "next/server";

import {
  requireActiveSubscriptionForCurrentUser,
} from "@/bin/require-auth";
import { normalizeStatisticsServiceSelection, requireAllowedStatisticsServices, StatisticsServiceSelectionError } from "@/lib/statistics/statistics-service-selection";

import {
  requireDashboardApiContext,
} from "@/lib/auth/dashboard-context";

import {
  requireStatisticsRole,
} from "@/lib/statistics/statistics-access";

import {
  resolveStatisticsDateRange,
  StatisticsDateRangeError,
} from "@/lib/statistics/statistics-date-range";

import {
  prepareDeterministicStatistics,
  StatisticsPrepareError,
} from "@/lib/statistics/statistics-prepare-service";

export const dynamic = "force-dynamic";

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}

export async function POST(request: Request) {
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

  const body = await request
    .json()
    .catch(() => null);

  if (!isRecord(body)) {
    return NextResponse.json(
      {
        success: false,
        error: "بيانات طلب التحضير غير صحيحة.",
        code: "INVALID_STATISTICS_REQUEST",
      },
      {
        status: 400,
      },
    );
  }

  if (!context.isAdmin) {
    const subscriptionResult = await requireActiveSubscriptionForCurrentUser();
    if (subscriptionResult instanceof Response) return subscriptionResult;
  }

  try {
    const serviceSlugs = normalizeStatisticsServiceSelection(body);
    await requireAllowedStatisticsServices(context, serviceSlugs);
    const range =
      resolveStatisticsDateRange({
        preset: body.preset,
        from: body.from,
        to: body.to,
      });

    const result =
      await prepareDeterministicStatistics({
        context,
        serviceSlugs,
        range,
      });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof StatisticsServiceSelectionError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.status });
    }
    if (
      error instanceof StatisticsDateRangeError
    ) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: "INVALID_STATISTICS_DATE_RANGE",
        },
        {
          status: 400,
        },
      );
    }

    if (
      error instanceof StatisticsPrepareError
    ) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
        },
        {
          status: error.status,
        },
      );
    }

    console.error(
      "statistics prepare failed",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "تعذر تجهيز البيانات الإحصائية.",
        code: "STATISTICS_PREPARE_FAILED",
      },
      {
        status: 500,
      },
    );
  }
}
