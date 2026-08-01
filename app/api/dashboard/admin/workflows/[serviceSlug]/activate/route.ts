import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import {
  activateWorkflow,
  WorkflowActivationConflictError,
} from "@/lib/workflows/workflow-activation-service";

type RouteContext = { params: Promise<{ serviceSlug: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;

  try {
    const { serviceSlug } = await context.params;
    const body = await request.json();
    const workflowId = String(body?.workflowId ?? "").trim();
    if (!workflowId) {
      return NextResponse.json({ success: false, error: "workflowId مطلوب." }, { status: 400 });
    }

    const target = await prisma.workflow.findFirst({
      where: { id: workflowId, service: { slug: serviceSlug } },
      select: { id: true },
    });
    if (!target) {
      return NextResponse.json(
        { success: false, error: "Workflow غير موجود داخل هذه الخدمة." },
        { status: 404 },
      );
    }

    const current = await getCurrentSessionUser();
    const result = await activateWorkflow({
      workflowId,
      actorUserId: current?.user.id,
      sourceAction: "ADMIN_ACTIVATE_API",
    });

    return NextResponse.json({
      success: true,
      message: "تم تفعيل Workflow بنجاح.",
      workflowId: result.workflow.id,
      canonicalSlot: result.canonicalSlot,
    });
  } catch (error) {
    console.error("WORKFLOW_ACTIVATE_ERROR", error);
    const conflict = error instanceof WorkflowActivationConflictError;
    return NextResponse.json(
      {
        success: false,
        code: conflict ? error.code : "WORKFLOW_ACTIVATION_FAILED",
        error: error instanceof Error ? error.message : "حدث خطأ أثناء تفعيل Workflow.",
      },
      { status: conflict ? 409 : 400 },
    );
  }
}
