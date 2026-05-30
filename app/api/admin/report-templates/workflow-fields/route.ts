import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { RuntimeWorkflowFieldOption } from "@/lib/report-engine/report-template-runtime-types";

const fallbackFields: RuntimeWorkflowFieldOption[] = [
  {
    key: "programTitle",
    label: "عنوان البرنامج",
    source: "fallback",
  },
  {
    key: "executionDate",
    label: "تاريخ التنفيذ",
    source: "fallback",
  },
  {
    key: "intro",
    label: "مقدمة التقرير",
    source: "fallback",
  },
  {
    key: "goals",
    label: "أهداف البرنامج",
    source: "fallback",
  },
  {
    key: "procedures",
    label: "إجراءات التنفيذ",
    source: "fallback",
  },
  {
    key: "results",
    label: "النتائج",
    source: "fallback",
  },
  {
    key: "recommendations",
    label: "التوصيات",
    source: "fallback",
  },
  {
    key: "targetGroup",
    label: "الفئة المستهدفة",
    source: "fallback",
  },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceSlug = searchParams.get("serviceSlug")?.trim();

    if (!serviceSlug) {
      return NextResponse.json({
        ok: true,
        source: "fallback",
        message: "لم يتم تحديد خدمة، تم استخدام الحقول الافتراضية.",
        fields: fallbackFields,
      });
    }

    const service = await prisma.service.findUnique({
      where: {
        slug: serviceSlug,
      },
      include: {
        workflows: {
          where: {
            status: "ACTIVE",
          },
          orderBy: [
            {
              isActive: "desc",
            },
            {
              updatedAt: "desc",
            },
          ],
          take: 1,
          include: {
            steps: {
              orderBy: {
                order: "asc",
              },
              include: {
                fields: {
                  orderBy: {
                    order: "asc",
                  },
                },
              },
            },
          },
        },
      },
    });

    const workflow = service?.workflows[0];

    if (!service || !workflow) {
      return NextResponse.json({
        ok: true,
        source: "fallback",
        message:
          "لم يتم العثور على Workflow نشط لهذه الخدمة، تم استخدام الحقول الافتراضية.",
        fields: fallbackFields,
      });
    }

    const fields: RuntimeWorkflowFieldOption[] = workflow.steps.flatMap((step) =>
      step.fields.map((field) => ({
        key: field.key,
        label: field.label,
        type: field.type,
        source: "workflow" as const,
        stepTitle: step.title,
      }))
    );

    return NextResponse.json({
      ok: true,
      source: fields.length ? "workflow" : "fallback",
      serviceSlug,
      serviceName: service.name,
      workflowId: workflow.id,
      workflowName: workflow.name,
      message: fields.length
        ? "تم جلب حقول الـ Workflow النشط."
        : "الـ Workflow النشط لا يحتوي على حقول، تم استخدام الحقول الافتراضية.",
      fields: fields.length ? fields : fallbackFields,
    });
  } catch (error) {
    console.error("workflow-fields error:", error);

    return NextResponse.json(
      {
        ok: true,
        source: "fallback",
        message:
          "تعذر جلب حقول الـ Workflow بسبب خطأ مؤقت، تم استخدام الحقول الافتراضية.",
        fields: fallbackFields,
      },
      { status: 200 }
    );
  }
}