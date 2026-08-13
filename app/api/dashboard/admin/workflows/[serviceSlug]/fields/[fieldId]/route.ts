import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { prisma } from "@/lib/prisma";
import {
  supportsWorkflowFieldAi,
  validateWorkflowFieldBehaviorConfig,
} from "@/lib/workflows/field-behavior-config";
import { supportsWorkflowFieldOptions } from "@/lib/workflows/workflow-field-options";

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

    const label = body?.label === undefined ? field.label : String(body.label).trim();
    if (!label || label.length > 500) {
      return NextResponse.json({ error: "عنوان الحقل مطلوب ويجب ألا يتجاوز 500 حرف." }, { status: 400 });
    }
    const placeholder = body?.placeholder === undefined
      ? field.placeholder
      : body.placeholder == null ? null : String(body.placeholder).trim().slice(0, 500) || null;
    const helpText = body?.helpText === undefined
      ? field.helpText
      : body.helpText == null ? null : String(body.helpText).trim().slice(0, 1000) || null;
    const behaviorConfig = validateWorkflowFieldBehaviorConfig(
      body?.behaviorConfig === undefined ? field.behaviorConfig : body.behaviorConfig,
    );
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
      data: {
        label,
        placeholder: ["TEXT", "TEXTAREA", "RICH_TEXT"].includes(field.type) ? placeholder : field.placeholder,
        helpText,
        isRequired: typeof body?.isRequired === "boolean" ? body.isRequired : field.isRequired,
        allowOther: supportsWorkflowFieldOptions(field.type) && typeof body?.allowOther === "boolean"
          ? body.allowOther
          : field.allowOther,
        behaviorConfig,
      },
      select: {
        id: true,
        label: true,
        placeholder: true,
        helpText: true,
        isRequired: true,
        allowOther: true,
        behaviorConfig: true,
      },
    });

    return NextResponse.json({ success: true, field: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر حفظ إعدادات الحقل." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const adminError = await requireAdminApi();
    if (adminError) return adminError;

    const { serviceSlug, fieldId } = await context.params;
    const body = await request.json().catch(() => null);
    const workflowId = String(body?.workflowId ?? "").trim();
    if (!workflowId) return NextResponse.json({ error: "workflowId مطلوب." }, { status: 400 });

    const field = await prisma.dynamicField.findFirst({
      where: { id: fieldId, step: { workflow: { id: workflowId, service: { slug: serviceSlug } } } },
      include: { step: { include: { workflow: true } } },
    });
    if (!field) return NextResponse.json({ error: "الحقل غير موجود في Workflow المحدد." }, { status: 404 });
    if (field.step.workflow.status === "ARCHIVED") {
      return NextResponse.json({ error: "لا يمكن تعديل Workflow مؤرشف." }, { status: 400 });
    }

    const dependentField = await prisma.dynamicField.findFirst({
      where: { id: { not: field.id }, step: { workflowId }, dependsOnFieldKey: field.key },
      select: { id: true },
    });
    if (dependentField) {
      return NextResponse.json({
        error: "لا يمكن حذف الحقل لأنه مرتبط بحقول أخرى داخل الـ Workflow. قم بإزالة الارتباطات أولًا ثم حاول مرة أخرى.",
      }, { status: 409 });
    }

    const historicalValueCount = await prisma.caseValue.count({ where: { fieldId: field.id } });
    await prisma.dynamicField.delete({ where: { id: field.id } });

    return NextResponse.json({ success: true, deletedFieldId: field.id, preservedHistoricalValues: historicalValueCount });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر حذف الحقل." },
      { status: 400 },
    );
  }
}
