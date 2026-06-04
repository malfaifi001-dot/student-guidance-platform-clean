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

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const adminError = await requireAdminApi();

    if (adminError) {
      return adminError;
    }

    const { serviceSlug } = await context.params;
    const body = await request.json();
    const workflowId = clean(body?.workflowId);

    if (!workflowId) {
      return NextResponse.json(
        {
          success: false,
          error: "workflowId مطلوب.",
        },
        { status: 400 },
      );
    }

    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        service: {
          slug: serviceSlug,
        },
      },
      include: {
        service: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
        _count: {
          select: {
            cases: true,
          },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json(
        {
          success: false,
          error: "Workflow غير موجود داخل هذه الخدمة.",
        },
        { status: 404 },
      );
    }

    if (workflow.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "لا يمكن حذف النسخة المفعلة حاليًا.",
        },
        { status: 400 },
      );
    }

    if (workflow._count.cases > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "لا يمكن حذف هذا Workflow لأنه مرتبط بحالات محفوظة. يمكن تركه كنسخة محفوظة أو أرشفته.",
        },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.workflow.delete({
        where: {
          id: workflow.id,
        },
      });

      await tx.platformActivityLog.create({
        data: {
          category: "WORKFLOW",
          action: "WORKFLOW_DELETED",
          severity: "WARNING",
          title: "تم حذف Workflow غير مفعل",
          details: {
            serviceSlug: workflow.service.slug,
            serviceName: workflow.service.name,
            workflowId: workflow.id,
            workflowName: workflow.name,
            workflowType: workflow.workflowType,
            version: workflow.version,
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "تم حذف Workflow بنجاح.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء حذف Workflow.",
      },
      { status: 400 },
    );
  }
}
