import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { prisma } from "@/lib/prisma";
import {
  supportsWorkflowFieldAi,
  validateWorkflowFieldBehaviorConfig,
} from "@/lib/workflows/field-behavior-config";

type RouteContext = {
  params: Promise<{ serviceSlug: string; fieldId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const adminError = await requireAdminApi();
    if (adminError) return adminError;

    const { serviceSlug, fieldId } = await context.params;
    const body = await request.json().catch(() => null);
    const workflowId = String(body?.workflowId ?? "").trim();
    if (!workflowId) {
      return NextResponse.json({ error: "workflowId مطلوب." }, { status: 400 });
    }

    const field = await prisma.dynamicField.findFirst({
      where: {
        id: fieldId,
        step: { workflow: { id: workflowId, service: { slug: serviceSlug } } },
      },
      include: { step: { include: { workflow: true } } },
    });
    if (!field) return NextResponse.json({ error: "الحقل غير موجود في Workflow المحدد." }, { status: 404 });
    if (field.step.workflow.status === "ARCHIVED") {
      return NextResponse.json({ error: "لا يمكن تعديل Workflow مؤرشف." }, { status: 400 });
    }

    const behaviorConfig = validateWorkflowFieldBehaviorConfig(body?.behaviorConfig);
    if (behaviorConfig.ai?.enabled && !supportsWorkflowFieldAi(field.type, field.isRepeater)) {
      return NextResponse.json({ error: "نوع هذا الحقل لا يدعم المساعد الذكي." }, { status: 400 });
    }

    const validKeys = new Set(
      (await prisma.dynamicField.findMany({
        where: { step: { workflowId } },
        select: { key: true },
      })).map((item) => item.key),
    );
    if (behaviorConfig.ai?.sourceFieldKeys.some((key) => !validKeys.has(key) || key === field.key)) {
      return NextResponse.json({ error: "تتضمن حقول المصدر قيمة غير صالحة." }, { status: 400 });
    }

    const updated = await prisma.dynamicField.update({
      where: { id: field.id },
      data: { behaviorConfig },
      select: { id: true, behaviorConfig: true },
    });

    return NextResponse.json({ success: true, field: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر حفظ إعدادات الحقل." },
      { status: 400 },
    );
  }
}
