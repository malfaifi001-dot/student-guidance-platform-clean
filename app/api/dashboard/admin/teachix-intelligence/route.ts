import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { answerTeachixIntelligence } from "@/lib/ai/teachix-intelligence/agent";

export async function POST(request: Request) {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;
  const body = await request.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!question || question.length > 2000) return NextResponse.json({ error: "A question is required." }, { status: 400 });
  try {
    const history = Array.isArray(body?.history)
      ? body.history
          .filter((item: unknown): item is { role: "user" | "assistant"; content: string } => Boolean(item && typeof item === "object" && ((item as { role?: string }).role === "user" || (item as { role?: string }).role === "assistant") && typeof (item as { content?: unknown }).content === "string"))
          .slice(-4)
          .map((item: { role: "user" | "assistant"; content: string }) => ({ role: item.role, content: item.content.slice(0, 1200) }))
      : [];
    const result = await answerTeachixIntelligence({ question, debug: body?.debug === true, history });
    return NextResponse.json({ answer: result.answer, ...(body?.debug === true ? { trace: result.trace, rounds: result.rounds } : {}) });
  } catch (error) {
    console.error("TEACHIX_INTELLIGENCE_FAILED", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to analyze Teachix." }, { status: 500 });
  }
}
