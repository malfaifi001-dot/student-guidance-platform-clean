import { NextResponse } from "next/server";

import {
  requireActiveSubscriptionForCurrentUser,
  requireServiceAccessForCurrentUser,
} from "@/bin/require-auth";

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

function normalizeServiceSlug(
  value: unknown,
) {
  const slug = String(value || "")
    .trim()
    .toLowerCase();

  if (
    !slug ||
    slug.length > 191 ||
    !/^[a-z0-9_-]+$/.test(slug)
  ) {
    return null;
  }

  return slug;
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

  const serviceSlug =
    normalizeServiceSlug(
      body.serviceSlug,
    );

  if (!serviceSlug) {
    return NextResponse.json(
      {
        success: false,
        error: "اختر خدمة صحيحة.",
        code:
          "STATISTICS_SERVICE_REQUIRED",
      },
      {
        status: 400,
      },
    );
  }

  const subscriptionResult =
    await requireActiveSubscriptionForCurrentUser();

  if (
    subscriptionResult instanceof Response
  ) {
    return subscriptionResult;
  }

  const serviceAccessResult =
    await requireServiceAccessForCurrentUser(
      serviceSlug,
    );

  if (
    serviceAccessResult instanceof Response
  ) {
    return serviceAccessResult;
  }

  try {
    const range =
      resolveStatisticsDateRange({
        preset: body.preset,
        from: body.from,
        to: body.to,
      });

    const selections =
      normalizeStatisticsSelections(
        body.selectedValues,
      );

    const prepared =
      await prepareDeterministicStatistics({
        context,
        serviceSlug,
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