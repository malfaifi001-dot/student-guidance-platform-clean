import { NextResponse } from "next/server";
import { generateCustomReportSchema } from "@/lib/custom-report/custom-report-ai-generator";
import { requireCustomReportContext } from "@/lib/custom-report/custom-report-auth";

export async function POST(request: Request) {
  const context = await requireCustomReportContext();

  if (!context.ok) {
    return NextResponse.json({ error: context.message }, { status: context.status });
  }

  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

  if (prompt.length < 15) {
    return NextResponse.json(
      { error: "اكتب وصفًا أوضح للتقرير المطلوب." },
      { status: 400 },
    );
  }

  const result = await generateCustomReportSchema(prompt);

  return NextResponse.json(result);
}