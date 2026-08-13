import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { prisma } from "@/lib/prisma";
import { supportsWorkflowFieldOptions } from "@/lib/workflows/workflow-field-options";

type RouteContext = { params: Promise<{ serviceSlug: string; fieldId: string; optionId: string }> };

async function findOwnedOption(serviceSlug: string, workflowId: string, fieldId: string, optionId: string) {
  return prisma.dynamicFieldOption.findFirst({
    where: { id: optionId, field: { id: fieldId, step: { workflow: { id: workflowId, service: { slug: serviceSlug } } } } },
    include: { field: { include: { step: { include: { workflow: true } } } } },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const adminError = await requireAdminApi();
    if (adminError) return adminError;
    const { serviceSlug, fieldId, optionId } = await context.params;
    const body = await request.json().catch(() => null);
    const workflowId = String(body?.workflowId ?? "").trim();
    const label = String(body?.label ?? "").trim();
    if (!workflowId || !label || label.length > 500) return NextResponse.json({ error: "اسم الخيار غير صالح." }, { status: 400 });
    const option = await findOwnedOption(serviceSlug, workflowId, fieldId, optionId);
    if (!option) return NextResponse.json({ error: "الخيار غير موجود في الحقل المحدد." }, { status: 404 });
    if (option.field.step.workflow.status === "ARCHIVED") return NextResponse.json({ error: "لا يمكن تعديل Workflow مؤرشف." }, { status: 400 });
    if (!supportsWorkflowFieldOptions(option.field.type)) return NextResponse.json({ error: "نوع هذا الحقل لا يدعم الخيارات." }, { status: 400 });
    const updated = await prisma.dynamicFieldOption.update({ where: { id: option.id }, data: { label } });
    return NextResponse.json({ success: true, option: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر تعديل الخيار." }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const adminError = await requireAdminApi();
    if (adminError) return adminError;
    const { serviceSlug, fieldId, optionId } = await context.params;
    const body = await request.json().catch(() => null);
    const workflowId = String(body?.workflowId ?? "").trim();
    if (!workflowId) return NextResponse.json({ error: "workflowId مطلوب." }, { status: 400 });
    const option = await findOwnedOption(serviceSlug, workflowId, fieldId, optionId);
    if (!option) return NextResponse.json({ error: "الخيار غير موجود في الحقل المحدد." }, { status: 404 });
    if (option.field.step.workflow.status === "ARCHIVED") return NextResponse.json({ error: "لا يمكن تعديل Workflow مؤرشف." }, { status: 400 });

    const [fieldReference, optionReference] = await Promise.all([
      prisma.dynamicField.findFirst({
        where: { step: { workflowId }, dependsOnFieldKey: option.field.key, linkedToValue: option.value }, select: { id: true },
      }),
      prisma.dynamicFieldOption.findFirst({
        where: {
          id: { not: option.id },
          linkedToValue: option.value,
          field: { step: { workflowId }, dependsOnFieldKey: option.field.key },
        },
        select: { id: true },
      }),
    ]);
    if (fieldReference || optionReference) {
      return NextResponse.json({ error: "لا يمكن حذف هذا الخيار لأنه مستخدم في ربط أحد الحقول." }, { status: 409 });
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.dynamicFieldOption.delete({ where: { id: option.id } });
      const remainingOptions = await transaction.dynamicFieldOption.findMany({
        where: { fieldId: option.fieldId },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: { id: true },
      });
      await Promise.all(
        remainingOptions.map((remainingOption, index) =>
          transaction.dynamicFieldOption.update({
            where: { id: remainingOption.id },
            data: { order: index + 1 },
          }),
        ),
      );
    });
    return NextResponse.json({ success: true, deletedOptionId: option.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر حذف الخيار." }, { status: 400 });
  }
}
