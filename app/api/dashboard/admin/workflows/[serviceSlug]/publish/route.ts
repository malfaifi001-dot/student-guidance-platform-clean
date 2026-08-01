import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import {
  activateWorkflow,
  WorkflowActivationConflictError,
} from "@/lib/workflows/workflow-activation-service";
import { getWorkflowSlotTypeAliases } from "@/lib/workflows/workflow-slot";

type RouteContext = { params: Promise<{ serviceSlug: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;

  try {
    const { serviceSlug } = await context.params;
    const service = await prisma.service.findUnique({ where: { slug: serviceSlug } });
    if (!service) {
      return NextResponse.json({ error: "الخدمة غير موجودة." }, { status: 404 });
    }

    const draftWorkflow = await prisma.workflow.findFirst({
      where: {
        serviceId: service.id,
        workflowType: { in: getWorkflowSlotTypeAliases("service-main") },
        status: "DRAFT",
      },
      orderBy: [{ version: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    });
    if (!draftWorkflow) {
      return NextResponse.json({ error: "لا يوجد Workflow مسودة لاعتماده." }, { status: 404 });
    }

    const current = await getCurrentSessionUser();
    const result = await activateWorkflow({
      workflowId: draftWorkflow.id,
      actorUserId: current?.user.id,
      sourceAction: "ADMIN_PUBLISH_API",
      activityAction: "WORKFLOW_PUBLISHED",
      activityTitle: "تم اعتماد Workflow",
    });

    return NextResponse.json({
      success: true,
      message: "تم اعتماد ونشر Workflow بنجاح.",
      workflowId: result.workflow.id,
      deactivatedCount: result.previousActiveWorkflowIds.length,
    });
  } catch (error) {
    const conflict = error instanceof WorkflowActivationConflictError;
    return NextResponse.json(
      {
        code: conflict ? error.code : "WORKFLOW_PUBLISH_FAILED",
        error: error instanceof Error ? error.message : "حدث خطأ أثناء اعتماد Workflow.",
      },
      { status: conflict ? 409 : 400 },
    );
  }
}
