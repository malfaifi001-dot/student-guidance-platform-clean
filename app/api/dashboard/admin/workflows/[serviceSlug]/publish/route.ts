import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { prisma } from "@/lib/prisma";
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

    const publishResult = await prisma.$transaction(async (tx) => {
      const service = await tx.service.findUnique({
        where: {
          slug: serviceSlug,
        },
      });

      if (!service) {
        return {
          ok: false as const,
          status: 404,
          error: "الخدمة غير موجودة.",
        };
      }

      const draftWorkflow = await tx.workflow.findFirst({
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
        return {
          ok: false as const,
          status: 404,
          error: "لا يوجد Workflow مسودة لاعتماده.",
        };
      }

      const deactivatedWorkflows = await tx.workflow.updateMany({
        where: {
          serviceId: draftWorkflow.serviceId,
          workflowType: draftWorkflow.workflowType,
          id: {
            not: draftWorkflow.id,
          },
          OR: [
            {
              isActive: true,
            },
            {
              status: "ACTIVE",
            },
          ],
        },
        data: {
          isActive: false,
          status: "ARCHIVED",
        },
      });

      const publishedWorkflow = await tx.workflow.update({
        where: {
          id: draftWorkflow.id,
        },
        data: {
          isActive: true,
          status: "ACTIVE",
        },
      });

      return {
        ok: true as const,
        service,
        publishedWorkflow,
        deactivatedCount: deactivatedWorkflows.count,
      };
    });

    if (!publishResult.ok) {
      return NextResponse.json(
        { error: publishResult.error },
        { status: publishResult.status },
      );
    }

    prisma.platformActivityLog
      .create({
        data: {
          category: "WORKFLOW",
          action: "WORKFLOW_PUBLISHED",
          severity: "INFO",
          title: "تم اعتماد Workflow",
          details: {
            serviceSlug: publishResult.service.slug,
            serviceName: publishResult.service.name,
            workflowId: publishResult.publishedWorkflow.id,
            workflowName: publishResult.publishedWorkflow.name,
            workflowType: publishResult.publishedWorkflow.workflowType,
            version: publishResult.publishedWorkflow.version,
            deactivatedCount: publishResult.deactivatedCount,
          },
        },
      })
      .catch((error) => {
        console.error("WORKFLOW_PUBLISH_ACTIVITY_LOG_ERROR", error);
      });

    return NextResponse.json({
      success: true,
      message: "تم اعتماد ونشر Workflow بنجاح.",
      workflowId: publishResult.publishedWorkflow.id,
      deactivatedCount: publishResult.deactivatedCount,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء اعتماد Workflow.",
      },
      { status: 400 },
    );
  }
}
