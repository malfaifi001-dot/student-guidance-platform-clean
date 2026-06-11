import { NextResponse } from "next/server";

import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { buildSmartReportPayloadForCase } from "@/lib/report-engine/smart-report-payload-builder";
import {
  getReportVariantById,
  resolveReportVariantId,
} from "@/lib/report-engine/report-variant-registry";
import {
  requireActiveSubscriptionApi,
  requireServiceAccessApi,
} from "@/lib/subscription/subscription-api-guard";

type RouteContext = {
  params: Promise<{
    caseId: string;
  }>;
};

function toJsonRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export async function POST(request: Request, context: RouteContext) {
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
    const body = toJsonRecord(await request.json().catch(() => ({})));
    const variantId = resolveReportVariantId(body.variantId);
    const variant = getReportVariantById(variantId);

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

    const caseEntry = await prisma.caseEntry.findUnique({
      where: {
        id: result.caseEntryId,
      },
      select: {
        id: true,
        schoolAccountId: true,
        title: true,
        serviceId: true,
      },
    });

    if (!caseEntry) {
      return NextResponse.json(
        {
          success: false,
          error: "لم يتم العثور على الحالة.",
        },
        { status: 404 },
      );
    }

    const report = await prisma.guidanceReport.create({
      data: {
        title: result.payload.title || "تقرير حالة",
        serviceSlug: result.serviceSlug,
        caseEntryId: result.caseEntryId,
        status: "GENERATED",
        genderMode: "MALE",
        editableContent:
          result.payload.narrative.body ||
          result.payload.caseInfo.title ||
          result.payload.title ||
          "",
        renderedContent: null,
        evidenceEnabled: true,
        templateSnapshot: {
          kind: "SMART_REPORT_VARIANT",
          engine: "smart-report",
          version: 1,
          variantId,
          variantName: variant.name,
          variantShortName: variant.shortName,
          generatedFrom: "case",
        },
        reportDataSnapshot: result.payload,
        generatedAt: new Date(),
      },
      select: {
        id: true,
      },
    });

    await prisma.platformActivityLog
      .create({
        data: {
          actorUserId: current.user.id,
          schoolAccountId: caseEntry.schoolAccountId,
          category: "REPORTS",
          action: "GENERATE_SMART_REPORT",
          severity: "INFO",
          title: "حفظ تقرير ذكي",
          details: {
            reportId: report.id,
            caseEntryId: result.caseEntryId,
            serviceSlug: result.serviceSlug,
            variantId,
            variantName: variant.name,
          },
        },
      })
      .catch(() => null);

    return NextResponse.json({
      success: true,
      reportId: report.id,
    });
  } catch (error) {
    console.error("SMART_REPORT_GENERATE_API_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        error: "حدث خطأ أثناء حفظ التقرير.",
      },
      { status: 500 },
    );
  }
}