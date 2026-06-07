import { NextResponse } from "next/server";
import { Prisma, type ReportTemplateType} from "@prisma/client";
import { prisma } from "@/lib/prisma";

type CreateReportTemplatePayload = {
  name?: string;
  description?: string;
  serviceSlug?: string | null;
  type?: ReportTemplateType;
  content?: string;
  templateJson?: unknown;
  genderAware?: boolean;
  isActive?: boolean;
};

function normalizeTemplateType(value: unknown): ReportTemplateType {
  if (value === "SYSTEM" || value === "SCHOOL" || value === "PERSONAL") {
    return value;
  }

  return "SYSTEM";
}

function toSafeString(value: unknown, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim() || fallback;
}

function normalizeJsonInput(value: unknown) {
  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const serviceSlug = searchParams.get("serviceSlug");
    const type = searchParams.get("type");
    const includeInactive = searchParams.get("includeInactive") === "true";

    const templates = await prisma.reportTemplate.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(serviceSlug ? { serviceSlug } : {}),
        ...(type === "SYSTEM" || type === "SCHOOL" || type === "PERSONAL"
          ? { type }
          : {}),
      },
      orderBy: [
        {
          updatedAt: "desc",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error("GET /api/dashboard/report-templates failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "تعذر جلب قوالب التقارير.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CreateReportTemplatePayload;

    const name = toSafeString(payload.name, "قالب تقرير جديد");

    const description = toSafeString(
      payload.description,
      "قالب تقرير محفوظ من صانع قوالب التقارير.",
    );

    const content = toSafeString(
      payload.content,
      description || "قالب تقرير محفوظ.",
    );

    const template = await prisma.reportTemplate.create({
      data: {
        name,
        description,
        serviceSlug: payload.serviceSlug || null,
        type: normalizeTemplateType(payload.type),
        content,
        ...(payload.templateJson !== undefined
          ? { templateJson: normalizeJsonInput(payload.templateJson) }
          : {}),
        genderAware:
          typeof payload.genderAware === "boolean"
            ? payload.genderAware
            : true,
        isActive:
          typeof payload.isActive === "boolean" ? payload.isActive : true,
        version: 1,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "تم إنشاء قالب التقارير بنجاح.",
        template,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/dashboard/report-templates failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "تعذر إنشاء قالب التقارير.",
      },
      { status: 500 },
    );
  }
}