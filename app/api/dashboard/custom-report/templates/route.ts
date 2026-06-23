import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCustomReportTemplateSchema } from "@/lib/custom-report/custom-report-api-schemas";
import { requireCustomReportContext } from "@/lib/custom-report/custom-report-auth";
import { normalizeCustomReportSchema } from "@/lib/custom-report/custom-report-normalizer";

export async function GET() {
  const context = await requireCustomReportContext();

  if (!context.ok) {
    return NextResponse.json({ error: context.message }, { status: context.status });
  }

  const templates = await prisma.customReportTemplate.findMany({
    where: {
      createdById: context.user.id,
      isArchived: false,
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      title: true,
      description: true,
      prompt: true,
      schemaJson: true,
      source: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const context = await requireCustomReportContext();

  if (!context.ok) {
    return NextResponse.json({ error: context.message }, { status: context.status });
  }

  const body = await request.json().catch(() => null);
  const payloadResult = createCustomReportTemplateSchema.safeParse(body);

  if (!payloadResult.success) {
    return NextResponse.json(
      {
        error:
          payloadResult.error.issues[0]?.message ||
          "بيانات قالب التقرير غير صالحة.",
      },
      { status: 400 },
    );
  }

  const payload = payloadResult.data;
  const schema = normalizeCustomReportSchema(payload.schema);

  const template = await prisma.customReportTemplate.create({
    data: {
      schoolAccountId: context.schoolAccountId,
      createdById: context.user.id,
      title: schema.title,
      description: schema.description || null,
      prompt: payload.prompt,
      schemaJson: schema,
      source: payload.source === "FALLBACK" ? "FALLBACK" : "AI",
    },
  });

  return NextResponse.json({ template });
}
