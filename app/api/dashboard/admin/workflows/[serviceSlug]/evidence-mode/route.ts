import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { prisma } from "@/lib/prisma";
import { normalizeWorkflowEvidenceMode } from "@/lib/workflows/workflow-runtime-settings";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    serviceSlug: string;
  }>;
};

async function findWorkflow(args: {
  serviceSlug: string;
  workflowId?: string | null;
}) {
  if (args.workflowId) {
    return prisma.workflow.findFirst({
      where: {
        id: args.workflowId,
        service: {
          slug: args.serviceSlug,
        },
      },
      select: {
        id: true,
        name: true,
        version: true,
        status: true,
        isActive: true,
        evidenceMode: true,
        service: {
          select: {
            slug: true,
            name: true,
          },
        },
      },
    });
  }

  return prisma.workflow.findFirst({
    where: {
      status: "DRAFT",
      service: {
        slug: args.serviceSlug,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      version: true,
      status: true,
      isActive: true,
      evidenceMode: true,
      service: {
        select: {
          slug: true,
          name: true,
        },
      },
    },
  });
}

export async function GET(request: Request, context: RouteContext) {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const { serviceSlug } = await context.params;
  const url = new URL(request.url);
  const workflowId = url.searchParams.get("workflowId");

  const workflow = await findWorkflow({
    serviceSlug,
    workflowId,
  });

  if (!workflow) {
    return NextResponse.json(
      {
        success: false,
        error: "لم يتم العثور على Workflow.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    workflow: {
      id: workflow.id,
      name: workflow.name,
      version: workflow.version,
      status: workflow.status,
      isActive: workflow.isActive,
      evidenceMode: workflow.evidenceMode,
    },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const adminError = await requireAdminApi();

    if (adminError) {
      return adminError;
    }

    const { serviceSlug } = await context.params;
    const body = await request.json().catch(() => ({}));

    const workflowId = String(body?.workflowId ?? "").trim();
    const evidenceMode = normalizeWorkflowEvidenceMode(body?.evidenceMode);

    if (!workflowId) {
      return NextResponse.json(
        {
          success: false,
          error: "workflowId مطلوب.",
        },
        { status: 400 },
      );
    }

    const workflow = await findWorkflow({
      serviceSlug,
      workflowId,
    });

    if (!workflow) {
      return NextResponse.json(
        {
          success: false,
          error: "لم يتم العثور على Workflow.",
        },
        { status: 404 },
      );
    }

    if (workflow.status === "ARCHIVED") {
      return NextResponse.json(
        {
          success: false,
          error: "لا يمكن تعديل Workflow مؤرشف.",
        },
        { status: 400 },
      );
    }

    const updated = await prisma.workflow.update({
      where: {
        id: workflow.id,
      },
      data: {
        evidenceMode: evidenceMode as any,
      },
      select: {
        id: true,
        name: true,
        version: true,
        status: true,
        isActive: true,
        evidenceMode: true,
      },
    });

    await prisma.platformActivityLog
      .create({
        data: {
          category: "WORKFLOW",
          action: "WORKFLOW_EVIDENCE_MODE_UPDATED",
          severity: "INFO",
          title: "تم تحديث إعداد الشواهد في Workflow",
          details: {
            serviceSlug,
            workflowId: updated.id,
            workflowName: updated.name,
            version: updated.version,
            status: updated.status,
            isActive: updated.isActive,
            previousEvidenceMode: workflow.evidenceMode,
            evidenceMode: updated.evidenceMode,
          },
        },
      })
      .catch(() => null);

    return NextResponse.json({
      success: true,
      message: "تم حفظ إعداد الشواهد.",
      workflow: updated,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "تعذر حفظ إعداد الشواهد.",
      },
      { status: 400 },
    );
  }
}
