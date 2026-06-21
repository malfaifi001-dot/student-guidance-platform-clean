import { NextResponse } from "next/server";

import { generateExecutionSummary } from "@/lib/ai/execution-summary-generator";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { normalizeReportLanguageMode } from "@/lib/report-engine/report-language-mode";
import { buildSmartReportPayloadForCase } from "@/lib/report-engine/smart-report-payload-builder";
import {
  requireActiveSubscriptionApi,
  requireServiceAccessApi,
} from "@/lib/subscription/subscription-api-guard";
import type {
  ReportFlowPrepareContext,
  ReportFlowSummaryField,
} from "@/lib/report-flow/report-flow-types";

type RouteContext = {
  params: Promise<{
    caseId: string;
  }>;
};

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function normalizeFields(value: unknown): ReportFlowSummaryField[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => toRecord(item))
    .map((item) => ({
      key: String(item.key || "").trim(),
      label: String(item.label || "").trim(),
      value: String(item.value || "").trim(),
    }))
    .filter((item) => item.label && item.value)
    .slice(0, 30);
}

function normalizeContext(value: unknown): Partial<ReportFlowPrepareContext> {
  const record = toRecord(value);

  return {
    languageMode: normalizeReportLanguageMode(record.languageMode),
    title: String(record.title || "").trim(),
    serviceName: String(record.serviceName || "").trim(),
    serviceSlug: String(record.serviceSlug || "").trim(),
    studentName: String(record.studentName || "").trim(),
    executorName: String(record.executorName || "").trim(),
    executorTitle: String(record.executorTitle || "").trim(),
  };
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

    const body = toRecord(await request.json().catch(() => ({})));
    const selectedFields = normalizeFields(body.fields);
    const clientContext = normalizeContext(body.context);

    const generated = await generateExecutionSummary({
      context: {
        caseId,
        languageMode: normalizeReportLanguageMode(
          clientContext.languageMode || result.payload.languageMode,
        ),
        title:
          clientContext.title ||
          result.payload.title ||
          result.payload.caseInfo.title ||
          "تقرير",
        serviceName:
          clientContext.serviceName || result.payload.service.name || "خدمة",
        serviceSlug:
          clientContext.serviceSlug || result.payload.service.slug || "general",
        studentName:
          clientContext.studentName || result.payload.student?.name || "",
        executorName: clientContext.executorName || "",
        executorTitle: clientContext.executorTitle || "",
      },
      fields: selectedFields,
    });

    return NextResponse.json({
      success: true,
      summary: generated.summary,
      source: generated.source,
    });
  } catch (error) {
    console.error("REPORT_FLOW_EXECUTION_SUMMARY_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        error: "تعذر توليد وصف التنفيذ.",
      },
      { status: 500 },
    );
  }
}
