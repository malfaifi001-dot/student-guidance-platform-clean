import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { prisma } from "@/lib/prisma";
import { supportsWorkflowFieldOptions } from "@/lib/workflows/workflow-field-options";

type RouteContext = { params: Promise<{ serviceSlug: string; fieldId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const adminError = await requireAdminApi();
    if (adminError) return adminError;
    const { serviceSlug, fieldId } = await context.params;
    const body = await request.json().catch(() => null);
    const workflowId = String(body?.workflowId ?? "").trim();
    const optionIds = Array.isArray(body?.optionIds) ? body.optionIds.map((id: unknown) => String(id).trim()).filter(Boolean) : [];
    if (!workflowId || !optionIds.length || new Set(optionIds).size !== optionIds.length) {
      return NextResponse.json({ error: "ترتيب الخيارات غير صالح." }, { status: 400 });
    }
    const field = await prisma.dynamicField.findFirst({
      where: { id: fieldId, step: { workflow: { id: workflowId, service: { slug: serviceSlug } } } },
      include: { step: { include: { workflow: true } }, options: { select: { id: true } } },
    });
    if (!field) return NextResponse.json({ error: "الحقل غير موجود في Workflow المحدد." }, { status: 404 });
    if (field.step.workflow.status === "ARCHIVED") return NextResponse.json({ error: "لا يمكن تعديل Workflow مؤرشف." }, { status: 400 });
    if (!supportsWorkflowFieldOptions(field.type)) return NextResponse.json({ error: "نوع هذا الحقل لا يدعم الخيارات." }, { status: 400 });
    const existingIds = new Set(field.options.map((option) => option.id));
    if (optionIds.length !== existingIds.size || optionIds.some((id: string) => !existingIds.has(id))) {
      return NextResponse.json({ error: "يجب إرسال جميع خيارات الحقل دون إضافة أو حذف." }, { status: 400 });
    }
    await prisma.$transaction(optionIds.map((id: string, index: number) => prisma.dynamicFieldOption.update({ where: { id }, data: { order: index + 1 } })));
    return NextResponse.json({ success: true, optionIds });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر حفظ ترتيب الخيارات." }, { status: 400 });
  }
}
