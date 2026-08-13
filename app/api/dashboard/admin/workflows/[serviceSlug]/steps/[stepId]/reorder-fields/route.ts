import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ serviceSlug: string; stepId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const adminError = await requireAdminApi();
    if (adminError) return adminError;

    const { serviceSlug, stepId } = await context.params;
    const body = await request.json().catch(() => null);
    const workflowId = String(body?.workflowId ?? "").trim();
    const fieldIds = Array.isArray(body?.fieldIds)
      ? body.fieldIds.map((id: unknown) => String(id).trim()).filter(Boolean)
      : [];
    if (!workflowId || !fieldIds.length || new Set(fieldIds).size !== fieldIds.length) {
      return NextResponse.json({ error: "ترتيب الحقول غير صالح." }, { status: 400 });
    }

    const step = await prisma.workflowStep.findFirst({
      where: { id: stepId, workflow: { id: workflowId, service: { slug: serviceSlug } } },
      include: { workflow: true, fields: { select: { id: true } } },
    });
    if (!step) return NextResponse.json({ error: "الخطوة غير موجودة في Workflow المحدد." }, { status: 404 });
    if (step.workflow.status === "ARCHIVED") {
      return NextResponse.json({ error: "لا يمكن تعديل Workflow مؤرشف." }, { status: 400 });
    }
    const existingIds = new Set(step.fields.map((field) => field.id));
    if (fieldIds.length !== existingIds.size || fieldIds.some((id: string) => !existingIds.has(id))) {
      return NextResponse.json({ error: "يجب إرسال جميع حقول الخطوة دون إضافة أو حذف." }, { status: 400 });
    }

    await prisma.$transaction(
      fieldIds.map((id: string, index: number) =>
        prisma.dynamicField.update({ where: { id }, data: { order: index + 1 } }),
      ),
    );

    return NextResponse.json({ success: true, fieldIds });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر حفظ ترتيب الحقول." },
      { status: 400 },
    );
  }
}
