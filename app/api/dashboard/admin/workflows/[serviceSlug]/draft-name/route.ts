import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    serviceSlug: string;
  }>;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export async function PATCH(request: Request, context: RouteContext) {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  try {
    const { serviceSlug } = await context.params;
    const body = await request.json();

    const workflowId = clean(body?.workflowId);
    const name = clean(body?.name);

    if (!workflowId || !name) {
      return NextResponse.json(
        { error: "workflowId و name مطلوبة." },
        { status: 400 },
      );
    }

    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        status: "DRAFT",
        service: {
          slug: serviceSlug,
        },
      },
      select: {
        id: true,
        _count: {
          select: {
            cases: true,
          },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "لم يتم العثور على مسودة قابلة للتعديل." },
        { status: 404 },
      );
    }

    if (workflow._count.cases > 0) {
      return NextResponse.json(
        {
          error:
            "لا يمكن تعديل اسم Workflow مستخدم في حالات محفوظة حفاظًا على السجلات السابقة.",
        },
        { status: 400 },
      );
    }

    const updatedWorkflow = await prisma.workflow.update({
      where: {
        id: workflow.id,
      },
      data: {
        name,
      },
    });

    await prisma.platformActivityLog
      .create({
        data: {
          category: "WORKFLOW",
          action: "DRAFT_RENAMED",
          severity: "INFO",
          title: "تم تعديل اسم مسودة Workflow",
          details: {
            serviceSlug,
            workflowId,
            workflowName: name,
          },
        },
      })
      .catch(() => null);

    return NextResponse.json({
      success: true,
      workflowId: updatedWorkflow.id,
      name: updatedWorkflow.name,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء تعديل اسم المسودة.",
      },
      { status: 400 },
    );
  }
}
