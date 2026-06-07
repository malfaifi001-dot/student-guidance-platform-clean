import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const stepId = body.stepId;

    if (!stepId) {
      return NextResponse.json(
        {
          error: "stepId مطلوب.",
        },
        { status: 400 }
      );
    }

    const latestField = await prisma.dynamicField.findFirst({
      where: {
        stepId,
      },
      orderBy: {
        order: "desc",
      },
    });

    const nextOrder = latestField ? latestField.order + 1 : 1;

    const field = await prisma.dynamicField.create({
      data: {
        stepId,
        key:
          body.key ||
          `field_${Date.now().toString().slice(-6)}`,

        label: body.label || "حقل جديد",

        type: body.type || "TEXT",

        placeholder: body.placeholder || null,

        helpText: body.helpText || null,

        isRequired: body.isRequired || false,

        order: nextOrder,

        allowOther: body.allowOther || false,

        dependsOnFieldKey:
          body.dependsOnFieldKey || null,

        linkedToValue:
          body.linkedToValue || null,
      },
    });

    return NextResponse.json({
      message: "تم إنشاء الحقل بنجاح.",
      field,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء إنشاء الحقل.",
      },
      { status: 400 }
    );
  }
}