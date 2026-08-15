import { NextResponse } from "next/server";

import { saveRuntimeCase } from "@/engine/cases/case-runtime-engine";
import { getRuntimeWorkflowByServiceSlug } from "@/engine/runtime/runtime-resolver";
import type { RuntimeCaseValues } from "@/lib/cases/case-values";
import { requirePrincipalEvaluationAccreditationApi } from "@/lib/principal/evaluation-accreditation-api";

type RouteContext = { params: Promise<{ serviceSlug: string }> };

function asValues(value: unknown): RuntimeCaseValues {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RuntimeCaseValues)
    : {};
}

export async function POST(request: Request, context: RouteContext) {
  const { serviceSlug } = await context.params;
  const access = await requirePrincipalEvaluationAccreditationApi(serviceSlug);
  if (!access.ok) return access.response;

  try {
    const body = await request.json().catch(() => null);
    const published = await getRuntimeWorkflowByServiceSlug(
      access.serviceDefinition.serviceSlug,
    );

    if (!published) {
      return NextResponse.json(
        { success: false, error: "لا يوجد Workflow منشور لهذه الخدمة." },
        { status: 409 },
      );
    }

    if (
      String(body?.workflowId || "") !== published.workflow.id ||
      String(body?.serviceId || "") !== published.service.id
    ) {
      return NextResponse.json(
        { success: false, error: "النموذج لا يتبع خدمة التقويم والاعتماد الحالية." },
        { status: 400 },
      );
    }

    const status = body?.status === "DRAFT" ? "DRAFT" : "SUBMITTED";
    const entry = await saveRuntimeCase({
      schoolAccountId: access.principal.schoolAccountId as string,
      createdById: access.principal.user.id,
      workflowId: published.workflow.id,
      serviceId: published.service.id,
      title: String(body?.title || access.serviceDefinition.title).trim(),
      values: asValues(body?.values),
      evidenceItems: Array.isArray(body?.evidenceItems)
        ? body.evidenceItems
        : [],
      status,
    });

    return NextResponse.json({
      success: true,
      caseId: entry.id,
      message: status === "DRAFT" ? "تم حفظ المسودة." : "تم حفظ السجل.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "تعذر حفظ السجل.",
      },
      { status: 400 },
    );
  }
}
