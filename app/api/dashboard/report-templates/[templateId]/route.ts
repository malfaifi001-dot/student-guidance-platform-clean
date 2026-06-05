import { NextResponse } from "next/server";
import { Prisma, type ReportTemplateType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    templateId: string;
  }>;
};

type UpdateReportTemplatePayload = {
  name?: string;
  description?: string | null;
  serviceSlug?: string | null;
  type?: ReportTemplateType;
  content?: string;
  templateJson?: unknown;
  genderAware?: boolean;
  isActive?: boolean;
  incrementVersion?: boolean;
};

function normalizeTemplateType(value: unknown): ReportTemplateType | undefined {
  if (value === "SYSTEM" || value === "SCHOOL" || value === "PERSONAL") {
    return value;
  }

  return undefined;
}

function toOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  return value.trim();
}

function normalizeJsonInput(value: unknown) {
  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { templateId } = await context.params;

    const template = await prisma.reportTemplate.findUnique({
      where: {
        id: templateId,
      },
    });

    if (!template) {
      return NextResponse.json(
        {
          success: false,
          message: "قالب التقارير غير موجود.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error(
      "GET /api/dashboard/report-templates/[templateId] failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "تعذر جلب قالب التقارير.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { templateId } = await context.params;
    const payload = (await request.json()) as UpdateReportTemplatePayload;

    const existingTemplate = await prisma.reportTemplate.findUnique({
      where: {
        id: templateId,
      },
      select: {
        id: true,
        version: true,
      },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        {
          success: false,
          message: "قالب التقارير غير موجود.",
        },
        { status: 404 },
      );
    }

    const nextType = normalizeTemplateType(payload.type);

    const data: Prisma.ReportTemplateUpdateInput = {};

    if (payload.name !== undefined) {
      data.name = toOptionalString(payload.name) || "قالب تقرير";
    }

    if (payload.description !== undefined) {
      data.description = payload.description;
    }

    if (payload.serviceSlug !== undefined) {
      data.serviceSlug = payload.serviceSlug || null;
    }

    if (nextType) {
      data.type = nextType;
    }

    if (payload.content !== undefined) {
      data.content = toOptionalString(payload.content) || "قالب تقرير محفوظ.";
    }

    if (payload.templateJson !== undefined) {
      data.templateJson = normalizeJsonInput(payload.templateJson);
    }

    if (typeof payload.genderAware === "boolean") {
      data.genderAware = payload.genderAware;
    }

    if (typeof payload.isActive === "boolean") {
      data.isActive = payload.isActive;
    }

    if (payload.incrementVersion) {
      data.version = existingTemplate.version + 1;
    }

    const template = await prisma.reportTemplate.update({
      where: {
        id: templateId,
      },
      data,
    });

    return NextResponse.json({
      success: true,
      message: "تم تحديث قالب التقارير بنجاح.",
      template,
    });
  } catch (error) {
    console.error(
      "PATCH /api/dashboard/report-templates/[templateId] failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "تعذر تحديث قالب التقارير.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { templateId } = await context.params;

    const template = await prisma.reportTemplate.update({
      where: {
        id: templateId,
      },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم أرشفة قالب التقارير بنجاح.",
      template,
    });
  } catch (error) {
    console.error(
      "DELETE /api/dashboard/report-templates/[templateId] failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "تعذر أرشفة قالب التقارير.",
      },
      { status: 500 },
    );
  }
}