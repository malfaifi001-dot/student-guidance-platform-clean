import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { WORKFLOW_TYPES } from "@/lib/workflows/workflow-types";

type RouteContext = {
  params: Promise<{
    serviceSlug: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  try {
    const { serviceSlug } = await context.params;

    const service = await prisma.service.findUnique({
      where: {
        slug: serviceSlug,
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: "الخدمة غير موجودة." },
        { status: 404 }
      );
    }

    const draftWorkflow = await prisma.workflow.findFirst({
      where: {
        serviceId: service.id,
        workflowType: WORKFLOW_TYPES.DEFAULT,
        status: "DRAFT",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!draftWorkflow) {
      return NextResponse.json(
        { error: "لا يوجد Workflow مسودة لاعتماده." },
        { status: 404 }
      );
    }

    await prisma.workflow.updateMany({
      where: {
        serviceId: draftWorkflow.serviceId,
        workflowType: WORKFLOW_TYPES.DEFAULT,
        status: "ACTIVE",
      },
      data: {
        status: "ARCHIVED",
        isActive: false,
      },
    });

    const publishedWorkflow = await prisma.workflow.update({
      where: {
        id: draftWorkflow.id,
      },
      data: {
        status: "ACTIVE",
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      workflowId: publishedWorkflow.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء اعتماد Workflow.",
      },
      { status: 400 }
    );
  }
}
