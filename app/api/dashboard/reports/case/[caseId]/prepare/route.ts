import { NextResponse } from "next/server";

import { getCurrentSessionUser } from "@/lib/auth/current-user";
import {
  requireActiveSubscriptionApi,
  requireServiceAccessApi,
} from "@/lib/subscription/subscription-api-guard";
import { buildSmartReportPayloadForCase } from "@/lib/report-engine/smart-report-payload-builder";

type RouteContext = {
  params: Promise<{
    caseId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const current = await getCurrentSessionUser();

    if (!current) {
      return NextResponse.json(
        {
          success: false,
          error: "يلزم تسجيل الدخول.",
        },
        { status: 401 },
      );
    }

    if (current.user.role !== "ADMIN") {
      const subscriptionGuard = await requireActiveSubscriptionApi();

      if (subscriptionGuard) {
        return subscriptionGuard;
      }
    }

    const params = await context.params;
    const caseId = String(params.caseId || "").trim();

    const result = await buildSmartReportPayloadForCase({
      caseId,
      current,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
        },
        { status: result.status },
      );
    }

    if (current.user.role !== "ADMIN") {
      const serviceGuard = await requireServiceAccessApi(result.serviceSlug);

      if (serviceGuard) {
        return serviceGuard;
      }
    }

    return NextResponse.json({
      success: true,
      payload: result.payload,
    });
  } catch (error) {
    console.error("SMART_REPORT_PREPARE_API_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        error: "حدث خطأ أثناء تجهيز التقرير.",
      },
      { status: 500 },
    );
  }
}