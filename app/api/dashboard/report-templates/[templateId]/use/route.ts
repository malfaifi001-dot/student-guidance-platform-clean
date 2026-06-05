import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    templateId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { templateId } = await context.params;

    const existingTemplate = await prisma.reportTemplate.findUnique({
      where: {
        id: templateId,
      },
    });

    if (!existingTemplate || !existingTemplate.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "قالب التقارير غير موجود أو غير مفعّل.",
        },
        { status: 404 },
      );
    }

    const template = await prisma.reportTemplate.update({
      where: {
        id: templateId,
      },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم تسجيل استخدام قالب التقارير.",
      template,
    });
  } catch (error) {
    console.error("POST /api/dashboard/report-templates/[templateId]/use failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "تعذر تسجيل استخدام قالب التقارير.",
      },
      { status: 500 },
    );
  }
}