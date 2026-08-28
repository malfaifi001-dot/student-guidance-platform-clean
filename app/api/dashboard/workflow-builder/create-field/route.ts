import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const body = await request.json();
    const stepId = String(body?.stepId || "").trim();
    if (!stepId) return NextResponse.json({ error: "stepId مطلوب." }, { status: 400 });

    const step = await prisma.workflowStep.findUnique({
      where: { id: stepId },
      select: { id: true },
    });
    if (!step) return NextResponse.json({ error: "الخطوة غير موجودة." }, { status: 404 });

    const latestField = await prisma.dynamicField.findFirst({
      where: { stepId: step.id },
      orderBy: { order: "desc" },
    });
    const nextOrder = latestField ? latestField.order + 1 : 1;
    const field = await prisma.dynamicField.create({
      data: {
        stepId: step.id,
        key: body.key || `field_${Date.now().toString().slice(-6)}`,
        label: body.label || "حقل جديد",
        type: body.type || "TEXT",
        placeholder: body.placeholder || null,
        helpText: body.helpText || null,
        isRequired: body.isRequired || false,
        order: nextOrder,
        allowOther: body.allowOther || false,
        dependsOnFieldKey: body.dependsOnFieldKey || null,
        linkedToValue: body.linkedToValue || null,
      },
    });
    return NextResponse.json({ message: "تم إنشاء الحقل بنجاح.", field });
  } catch {
    return NextResponse.json({ error: "تعذر إنشاء الحقل." }, { status: 400 });
  }
}
