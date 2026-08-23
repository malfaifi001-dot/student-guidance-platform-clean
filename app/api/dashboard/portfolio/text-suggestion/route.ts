import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePortfolioApiUser, portfolioApiError } from "@/lib/portfolio/portfolio-api";
import {
  generatePortfolioTextSuggestion,
  PORTFOLIO_TEXT_CONTENT_TYPES,
  PORTFOLIO_TEXT_LENGTHS,
  PORTFOLIO_TEXT_TONES,
} from "@/lib/ai/portfolio-text-suggestion";

export const runtime = "nodejs";

const requestSchema = z.object({
  contentType: z.enum(PORTFOLIO_TEXT_CONTENT_TYPES),
  length: z.enum(PORTFOLIO_TEXT_LENGTHS),
  tone: z.enum(PORTFOLIO_TEXT_TONES),
});

export async function POST(request: Request) {
  try {
    await requirePortfolioApiUser();
    const input = requestSchema.parse(await request.json());
    const text = await generatePortfolioTextSuggestion(input);
    return NextResponse.json({ ok: true, text });
  } catch (error) {
    if (error instanceof Error && ["DEEPSEEK_TIMEOUT", "DEEPSEEK_NETWORK_ERROR", "EMPTY_PORTFOLIO_SUGGESTION"].includes(error.message)) {
      return NextResponse.json(
        { ok: false, error: "تعذر توليد النص حاليًا، حاول مرة أخرى." },
        { status: 502 },
      );
    }

    return portfolioApiError(error);
  }
}
