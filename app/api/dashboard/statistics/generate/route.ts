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

    const selectedValues =
      normalizeStatisticsSelections(
        body.selectedValues,
        serviceSlugs.length === 1 ? serviceSlugs[0] : undefined,
      );

    const result =
      await createStatisticsReport({
        context,
        serviceSlugs,
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
