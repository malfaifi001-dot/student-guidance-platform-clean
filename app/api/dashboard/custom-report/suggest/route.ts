import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  generateCustomReportSchema,
  type CustomReportGenerationContext,
} from "@/lib/custom-report/custom-report-ai-generator";
import { requireCustomReportContext } from "@/lib/custom-report/custom-report-auth";

function normalizeList(value: unknown) {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    })
    .slice(0, 30);
}

function readBodyContext(value: unknown): CustomReportGenerationContext | undefined {
  if (!value || typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;

  return {
    subject: typeof record.subject === "string" ? record.subject : "",
    stage: typeof record.stage === "string" ? record.stage : "",
    reportType: typeof record.reportType === "string" ? record.reportType : "",
    targetAudience: typeof record.targetAudience === "string" ? record.targetAudience : "",
  };
}

function getUserIdFromContext(context: unknown) {
  const record = context as any;

  return (
    record?.current?.user?.id ||
    record?.user?.id ||
    record?.currentUser?.id ||
    null
  );
}

export async function POST(request: Request) {
  const authContext = await requireCustomReportContext();

  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

  if (prompt.length < 15) {
    return NextResponse.json(
      {
        success: false,
        error: "اكتب وصفًا أوضح للتقرير لا يقل عن 15 حرفًا.",
      },
      { status: 400 },
    );
  }

  const userId = getUserIdFromContext(authContext);

  const profile = userId
    ? await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          teachingStages: true,
          teachingSpecialties: true,
          teachingSubjects: true,
        },
      })
    : null;

  const bodyContext = readBodyContext(body?.context);

  const generationContext: CustomReportGenerationContext = {
    ...bodyContext,
    stages: normalizeList(profile?.teachingStages),
    specialties: normalizeList(profile?.teachingSpecialties),
    subjects: normalizeList(profile?.teachingSubjects),
  };

  const result = await generateCustomReportSchema(prompt, generationContext);

  return NextResponse.json({
    success: true,
    schema: result.schema,
    source: result.source,
  });
}