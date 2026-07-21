import { NextResponse } from "next/server";

import {
  requireActiveSubscriptionForCurrentUser,
  requireServiceAccessForCurrentUser,
} from "@/bin/require-auth";

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
  createStatisticsReport,
  StatisticsReportServiceError,
} from "@/lib/statistics/statistics-report-service";

import {
  normalizeStatisticsSelections,
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
          "بيانات حفظ التقرير غير صحيحة.",
        code:
          "INVALID_STATISTICS_GENERATE_REQUEST",
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

    const selectedValues =
      normalizeStatisticsSelections(
        body.selectedValues,
      );

    const result =
      await createStatisticsReport({
        context,
        serviceSlug,
        range,
        selectedValues,

        analysis: {
          executiveDescription:
            body.executiveDescription,

          insights:
            body.insights,

          recommendations:
            body.recommendations,

          analysisMode:
            body.analysisMode,
        },
      });

    return NextResponse.json({
      success: true,
      reportId: result.reportId,
      title: result.title,
      createdAt:
        result.createdAt,
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
      StatisticsReportServiceError
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
      error instanceof Error &&
      error.name === "ZodError"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "راجع الوصف التنفيذي والاستنتاجات قبل الحفظ.",
          code:
            "INVALID_STATISTICS_ANALYSIS",
        },
        {
          status: 400,
        },
      );
    }

    console.error(
      "statistics generate failed",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "تعذر حفظ التقرير الإحصائي.",
        code:
          "STATISTICS_GENERATE_FAILED",
      },
      {
        status: 500,
      },
    );
  }
}