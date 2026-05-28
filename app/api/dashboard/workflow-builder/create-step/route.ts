import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const workflowId = body.workflowId;

    if (!workflowId) {
      return NextResponse.json(
        {
          error: "workflowId مطلوب.",
        },
        { status: 400 }
      );
    }

    const latestStep = await prisma.workflowStep.findFirst({
      where: {
        workflowId,
      },
      orderBy: {
        order: "desc",
      },
    });

    const nextOrder = latestStep ? latestStep.order + 1 : 1;

    const step = await prisma.workflowStep.create({
      data: {
        workflowId,
        title: body.title || `خطوة ${nextOrder}`,
        description: body.description || null,
        order: nextOrder,
      },
    });

    return NextResponse.json({
      message: "تم إنشاء الخطوة بنجاح.",
      step,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء إنشاء الخطوة.",
      },
      { status: 400 }
    );
  }
}