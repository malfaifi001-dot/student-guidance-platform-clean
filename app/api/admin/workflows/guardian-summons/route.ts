import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  FAMILY_SCHOOL_COMMUNICATION_SERVICE,
  GUARDIAN_SUMMONS_WORKFLOW,
} from "@/lib/workflows/guardian-summons-workflow-template";

export async function POST() {
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

    await prisma.workflow.updateMany({
      where: {
        serviceId: service.id,
        workflowType: GUARDIAN_SUMMONS_WORKFLOW.workflowType,
        isActive: true,
      },
      data: {
        isActive: false,
        status: "ARCHIVED",
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
        status: "ACTIVE",
        isActive: true,
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

    return NextResponse.json({
      ok: true,
      message: "تم إنشاء ونشر Workflow استدعاء ولي أمر بنجاح.",
      workflowId: workflow.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "تعذر إنشاء Workflow استدعاء ولي أمر.",
      },
      { status: 400 },
    );
  }
}
