import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const body = await request.json();
    const workflowId = String(body?.workflowId || "").trim();
    if (!workflowId) return NextResponse.json({ error: "workflowId مطلوب." }, { status: 400 });

    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      select: { id: true },
    });
    if (!workflow) return NextResponse.json({ error: "سير العمل غير موجود." }, { status: 404 });

    const latestStep = await prisma.workflowStep.findFirst({
      where: { workflowId: workflow.id },
      orderBy: { order: "desc" },
    });
    const nextOrder = latestStep ? latestStep.order + 1 : 1;
    const step = await prisma.workflowStep.create({
      data: {
        workflowId: workflow.id,
        title: body.title || `خطوة ${nextOrder}`,
        description: body.description || null,
        order: nextOrder,
      },
    });
    return NextResponse.json({ message: "تم إنشاء الخطوة بنجاح.", step });
  } catch {
    return NextResponse.json({ error: "تعذر إنشاء الخطوة." }, { status: 400 });
  }
}
