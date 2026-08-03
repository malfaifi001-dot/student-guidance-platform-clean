import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { activateWorkflow } from "@/lib/workflows/workflow-activation-service";
import {
  FAMILY_SCHOOL_COMMUNICATION_SERVICE,
  GUARDIAN_SUMMONS_WORKFLOW,
} from "@/lib/workflows/guardian-summons-workflow-template";

export async function POST() {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;

  try {
    const service = await prisma.service.upsert({
      where: {
        slug: FAMILY_SCHOOL_COMMUNICATION_SERVICE.slug,
      },
      update: {
        name: FAMILY_SCHOOL_COMMUNICATION_SERVICE.name,
        description: FAMILY_SCHOOL_COMMUNICATION_SERVICE.description,
        status: "ACTIVE",
      },
      create: {
        slug: FAMILY_SCHOOL_COMMUNICATION_SERVICE.slug,
        name: FAMILY_SCHOOL_COMMUNICATION_SERVICE.name,
        description: FAMILY_SCHOOL_COMMUNICATION_SERVICE.description,
        status: "ACTIVE",
      },
    });

    const latest = await prisma.workflow.findFirst({
      where: {
        serviceId: service.id,
        workflowType: GUARDIAN_SUMMONS_WORKFLOW.workflowType,
      },
      orderBy: {
        version: "desc",
      },
    });

    const workflow = await prisma.workflow.create({
      data: {
        serviceId: service.id,
        workflowType: GUARDIAN_SUMMONS_WORKFLOW.workflowType,
        name: GUARDIAN_SUMMONS_WORKFLOW.name,
        version: latest ? latest.version + 1 : 1,
        status: "DRAFT",
        isActive: false,
        activeKey: null,
        steps: {
          create: GUARDIAN_SUMMONS_WORKFLOW.steps.map((step: any) => ({
            title: step.title,
            description: step.description,
            order: step.order,
            fields: {
              create: step.fields.map((field: any) => ({
                key: field.key,
                label: field.label,
                type: field.type as any,
                placeholder: "placeholder" in field ? field.placeholder : null,
                helpText: "helpText" in field ? field.helpText : null,
                isRequired: field.isRequired,
                order: field.order,
                dependsOnFieldKey:
                  "dependsOnFieldKey" in field ? field.dependsOnFieldKey : null,
                linkedToValue:
                  "linkedToValue" in field ? field.linkedToValue : null,
                allowOther: "allowOther" in field ? Boolean(field.allowOther) : false,
                options: {
                  create: field.options.map((option: any, index: any) => ({
                    value: option[0],
                    label: option[1],
                    order: index + 1,
                  })),
                },
              })),
            },
          })),
        },
      },
    });

    const current = await getCurrentSessionUser();
    await activateWorkflow({
      workflowId: workflow.id,
      actorUserId: current?.user.id,
      sourceAction: "GUARDIAN_SUMMONS_TEMPLATE_CREATE",
      activityAction: "WORKFLOW_PUBLISHED",
      activityTitle: "تم إنشاء ونشر Workflow إشعار ولي الأمر",
    });

    return NextResponse.json({
      ok: true,
      message: "تم إنشاء ونشر Workflow إشعار ولي الأمر بنجاح.",
      workflowId: workflow.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "تعذر إنشاء Workflow إشعار ولي الأمر.",
      },
      { status: 400 },
    );
  }
}
