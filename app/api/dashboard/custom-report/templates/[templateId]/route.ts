import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateCustomReportTemplateSchema } from "@/lib/custom-report/custom-report-api-schemas";
import { requireCustomReportContext } from "@/lib/custom-report/custom-report-auth";
import { normalizeCustomReportSchema } from "@/lib/custom-report/custom-report-normalizer";

type RouteContext = {
  params: Promise<{
    templateId: string;
  }>;
};

export async function GET(_request: Request, contextParams: RouteContext) {
  const context = await requireCustomReportContext();

  if (!context.ok) {
    return NextResponse.json({ error: context.message }, { status: context.status });
  }

  const { templateId } = await contextParams.params;

  const template = await prisma.customReportTemplate.findFirst({
    where: {
      id: templateId,
      createdById: context.user.id,
      isArchived: false,
    },
  });

  if (!template) {
    return NextResponse.json({ error: "القالب غير موجود." }, { status: 404 });
  }

  return NextResponse.json({ template });
}

export async function PATCH(request: Request, contextParams: RouteContext) {
  const context = await requireCustomReportContext();

  if (!context.ok) {
    return NextResponse.json({ error: context.message }, { status: context.status });
  }

  const { templateId } = await contextParams.params;
  const body = await request.json().catch(() => null);
  const payloadResult = updateCustomReportTemplateSchema.safeParse(body);

  if (!payloadResult.success) {
    return NextResponse.json(
      {
        error:
          payloadResult.error.issues[0]?.message ||
          "بيانات تحديث القالب غير صالحة.",
      },
      { status: 400 },
    );
  }

  const schema = normalizeCustomReportSchema(payloadResult.data.schema);

  const existing = await prisma.customReportTemplate.findFirst({
    where: {
      id: templateId,
      createdById: context.user.id,
      isArchived: false,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "القالب غير موجود." }, { status: 404 });
  }

  const template = await prisma.customReportTemplate.update({
    where: {
      id: templateId,
    },
    data: {
      title: schema.title,
      description: schema.description || null,
      schemaJson: schema,
    },
  });

  return NextResponse.json({ template });
}

export async function DELETE(_request: Request, contextParams: RouteContext) {
  const context = await requireCustomReportContext();

  if (!context.ok) {
    return NextResponse.json({ error: context.message }, { status: context.status });
  }

  const { templateId } = await contextParams.params;

  const existing = await prisma.customReportTemplate.findFirst({
    where: {
      id: templateId,
      createdById: context.user.id,
      isArchived: false,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "القالب غير موجود." }, { status: 404 });
  }

  await prisma.customReportTemplate.update({
    where: {
      id: templateId,
    },
    data: {
      isArchived: true,
      status: "ARCHIVED",
    },
  });

  return NextResponse.json({ ok: true });
}
