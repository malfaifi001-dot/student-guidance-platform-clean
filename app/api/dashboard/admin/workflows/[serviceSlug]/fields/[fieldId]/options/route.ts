import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { prisma } from "@/lib/prisma";
import { createWorkflowOptionValue, supportsWorkflowFieldOptions } from "@/lib/workflows/workflow-field-options";

type RouteContext = { params: Promise<{ serviceSlug: string; fieldId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const adminError = await requireAdminApi();
    if (adminError) return adminError;
    const { serviceSlug, fieldId } = await context.params;
    const body = await request.json().catch(() => null);
    const workflowId = String(body?.workflowId ?? "").trim();
    const label = String(body?.label ?? "").trim();
    if (!workflowId || !label || label.length > 500) {
      return NextResponse.json({ error: "اسم الخيار مطلوب ويجب ألا يتجاوز 500 حرف." }, { status: 400 });
    }

    const field = await prisma.dynamicField.findFirst({
      where: { id: fieldId, step: { workflow: { id: workflowId, service: { slug: serviceSlug } } } },
      include: { step: { include: { workflow: true } }, options: { select: { value: true, order: true } } },
    });
    if (!field) return NextResponse.json({ error: "الحقل غير موجود في Workflow المحدد." }, { status: 404 });
    if (field.step.workflow.status === "ARCHIVED") return NextResponse.json({ error: "لا يمكن تعديل Workflow مؤرشف." }, { status: 400 });
    if (!supportsWorkflowFieldOptions(field.type)) return NextResponse.json({ error: "نوع هذا الحقل لا يدعم الخيارات." }, { status: 400 });

    const existingValues = new Set(field.options.map((option) => option.value));
    let value = createWorkflowOptionValue();
    while (existingValues.has(value)) value = createWorkflowOptionValue();
    const nextOrder = field.options.reduce((maximum, option) => Math.max(maximum, option.order), 0) + 1;
    const option = await prisma.dynamicFieldOption.create({
      data: { fieldId: field.id, label, value, order: nextOrder },
    });
    return NextResponse.json({ success: true, option }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر إضافة الخيار." }, { status: 400 });
  }
}
