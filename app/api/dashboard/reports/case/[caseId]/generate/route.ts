import { NextResponse } from "next/server";

import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { buildCaseEntryWhereForUser } from "@/lib/cases/case-access-scope";
import { buildSmartReportPayloadForCase } from "@/lib/report-engine/smart-report-payload-builder";
import { applyReportDraftAdjustments } from "@/lib/report-engine/report-draft-merger";
import type { ReportDraftAdjustments } from "@/lib/report-engine/smart-report-types";
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
      const subscriptionGuard = await requireActiveSubscriptionApi({ allowPrincipal: true });

      if (subscriptionGuard) {
        return subscriptionGuard;
      }
    }

    const params = await context.params;
    const caseId = String(params.caseId || "").trim();
    const body = toJsonRecord(await request.json().catch(() => ({})));
    const variantId = resolveReportVariantId(
      typeof body.variantId === "string" ? body.variantId : undefined,
    );
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
      const serviceGuard = await requireServiceAccessApi(result.serviceSlug, {
        allowPrincipal: true,
      });

      if (serviceGuard) {
        return serviceGuard;
      }
    }

    const rawAdjustments = body.reportDraftAdjustments as ReportDraftAdjustments | null | undefined;

    const adjustedPayload = applyReportDraftAdjustments(
      result.payload,
      rawAdjustments
    );

    if (rawAdjustments?.evidenceConfig) {
      adjustedPayload.evidenceConfig = rawAdjustments.evidenceConfig;
    }

    const caseEntry = await prisma.caseEntry.findFirst({
      where: {
        id: result.caseEntryId,
        ...buildCaseEntryWhereForUser({
          id: current.user.id,
          role: current.user.role,
          schoolAccountId: current.user.schoolAccountId,
          email: current.user.email,
        }),
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
        title: adjustedPayload.title || "تقرير حالة",
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
        reportDataSnapshot: adjustedPayload,
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
