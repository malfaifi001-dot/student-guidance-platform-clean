import { NextResponse } from "next/server";

import { logAdminActivity } from "@/lib/admin/activity-log";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ serviceSlug: string }>;
};

const MAX_NAME_LENGTH = 160;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export async function PATCH(request: Request, context: RouteContext) {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;

  const current = await getCurrentSessionUser();

  try {
    const { serviceSlug } = await context.params;
    const body = await request.json();
    const workflowId = clean(body?.workflowId);
    const name = clean(body?.name);

    if (!workflowId || !name) {
      return NextResponse.json(
        { error: "معرّف Workflow والاسم مطلوبان." },
        { status: 400 },
      );
    }

    if (name.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: `يجب ألا يتجاوز الاسم ${MAX_NAME_LENGTH} حرفًا.` },
        { status: 400 },
      );
    }

    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, service: { slug: serviceSlug } },
      select: { id: true, name: true, version: true, status: true, isActive: true },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "لم يتم العثور على Workflow لهذه الخدمة." },
        { status: 404 },
      );
    }

    const updated = await prisma.workflow.update({
      where: { id: workflow.id },
      data: { name },
      select: { id: true, name: true, version: true, status: true, isActive: true },
    });

    await logAdminActivity({
      actorUserId: current?.user.id || null,
      schoolAccountId: current?.user.schoolAccountId || null,
      category: "WORKFLOW",
      action: "WORKFLOW_RENAMED",
      severity: "SUCCESS",
      title: "تم تعديل اسم Workflow",
      details: {
        serviceSlug,
        workflowId: workflow.id,
        version: workflow.version,
        oldName: workflow.name,
        newName: updated.name,
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم تعديل اسم Workflow بنجاح.",
      workflow: updated,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء تعديل اسم Workflow.",
      },
      { status: 400 },
    );
  }
}
