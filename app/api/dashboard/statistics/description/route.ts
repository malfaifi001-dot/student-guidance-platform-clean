import { NextResponse } from "next/server";

import {
  requireActiveSubscriptionForCurrentUser,
} from "@/bin/require-auth";
import { normalizeStatisticsServiceSelection, requireAllowedStatisticsServices, StatisticsServiceSelectionError } from "@/lib/statistics/statistics-service-selection";

import {
  requireDashboardApiContext,
} from "@/lib/auth/dashboard-context";

import {
  analyzeSelectedStatistics,
} from "@/lib/statistics/statistics-ai-analyzer";

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

import {
  normalizeStatisticsSelections,
  selectPreparedStatisticsMetrics,
  StatisticsSelectionError,
} from "@/lib/statistics/statistics-selection";

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

export async function POST(
  request: Request,
) {
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
        error:
          "بيانات طلب الوصف غير صحيحة.",
        code:
          "INVALID_STATISTICS_DESCRIPTION_REQUEST",
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

    const selections =
      normalizeStatisticsSelections(
        body.selectedValues,
        serviceSlugs.length === 1 ? serviceSlugs[0] : undefined,
      );

    const prepared =
      await prepareDeterministicStatistics({
        context,
        serviceSlugs,
        range,
      });

    const selectedMetrics =
      selectPreparedStatisticsMetrics(
        prepared,
        selections,
      );

    const analysis =
      await analyzeSelectedStatistics({
        prepared,
        selectedMetrics,
      });

    return NextResponse.json({
      success: true,

      data: {
        service: prepared.service,
        services: prepared.services,
        dateRange:
          prepared.dateRange,

        sourceCaseCount:
          prepared.sourceCaseCount,

        sourceReportCount:
          prepared.sourceReportCount,

        selectedMetrics,
        analysis,
      },
    });
  } catch (error) {
    if (error instanceof StatisticsServiceSelectionError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.status });
    }
    if (
      error instanceof
      StatisticsDateRangeError
    ) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code:
            "INVALID_STATISTICS_DATE_RANGE",
        },
        {
          status: 400,
        },
      );
    }

    if (
      error instanceof
      StatisticsSelectionError
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

    if (
      error instanceof
      StatisticsPrepareError
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
      "statistics description failed",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "تعذر إنشاء الوصف التنفيذي.",
        code:
          "STATISTICS_DESCRIPTION_FAILED",
      },
      {
        status: 500,
      },
    );
  }
}
