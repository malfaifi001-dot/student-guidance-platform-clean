import { NextResponse } from "next/server";

import { saveRuntimeCase } from "@/engine/cases/case-runtime-engine";
import { getRuntimeWorkflowByServiceSlug } from "@/engine/runtime/runtime-resolver";
import type { RuntimeCaseValues } from "@/lib/cases/case-values";
import { requirePrincipalPerformanceApi } from "@/lib/principal/performance-api";
import {
  createSimplePrincipalPerformanceEntry,
  normalizeSimplePerformanceRows,
} from "@/lib/principal/performance-service";

type RouteContext = { params: Promise<{ itemSlug: string }> };

function asValues(value: unknown): RuntimeCaseValues {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RuntimeCaseValues)
    : {};
}

export async function POST(request: Request, context: RouteContext) {
  const { itemSlug } = await context.params;
  const access = await requirePrincipalPerformanceApi(itemSlug);
  if (!access.ok) return access.response;

  try {
    const body = await request.json().catch(() => null);
    const mode = String(body?.mode || "").trim();
    const published = await getRuntimeWorkflowByServiceSlug(
      access.performanceItem.serviceSlug,
    );

    if (mode === "simple") {
      if (published) {
        return NextResponse.json(
          {
            success: false,
            error: "تم نشر Workflow لهذا العنصر. أعد فتح صفحة الإنشاء لاستخدام النموذج المنشور.",
          },
          { status: 409 },
        );
      }

      const rows = normalizeSimplePerformanceRows(body?.rows);
      const entry = await createSimplePrincipalPerformanceEntry({
        performanceItem: access.performanceItem,
        serviceId: access.service.id,
        schoolAccountId: access.principal.schoolAccountId as string,
        createdById: access.principal.user.id,
        rows,
      });

      return NextResponse.json({
        success: true,
        caseId: entry.id,
        message: "تم حفظ بيانات عنصر التقييم.",
      });
    }

    if (mode !== "workflow" || !published) {
      return NextResponse.json(
        { success: false, error: "لا يوجد Workflow منشور لهذا العنصر." },
        { status: 409 },
      );
    }

    if (
      String(body?.workflowId || "") !== published.workflow.id ||
      String(body?.serviceId || "") !== published.service.id
    ) {
      return NextResponse.json(
        { success: false, error: "النموذج لا يتبع عنصر التقييم الحالي." },
        { status: 400 },
      );
    }

    const status = body?.status === "DRAFT" ? "DRAFT" : "SUBMITTED";
    const entry = await saveRuntimeCase({
      schoolAccountId: access.principal.schoolAccountId as string,
      createdById: access.principal.user.id,
      workflowId: published.workflow.id,
      serviceId: published.service.id,
      title: String(body?.title || access.performanceItem.title).trim(),
      values: asValues(body?.values),
      evidenceItems: Array.isArray(body?.evidenceItems) ? body.evidenceItems : [],
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
