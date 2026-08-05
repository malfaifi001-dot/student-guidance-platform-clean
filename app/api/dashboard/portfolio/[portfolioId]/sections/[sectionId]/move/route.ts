import { NextResponse } from "next/server";

import { portfolioApiError, requirePortfolioApiUser } from "@/lib/portfolio/portfolio-api";
import { movePortfolioSection } from "@/lib/portfolio/portfolio-service";
import { portfolioMoveSchema } from "@/lib/portfolio/portfolio-types";

type Context = { params: Promise<{ portfolioId: string; sectionId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requirePortfolioApiUser();
    const { portfolioId, sectionId } = await context.params;
    const input = portfolioMoveSchema.parse(await request.json());
    await movePortfolioSection(user, portfolioId, sectionId, input.direction);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return portfolioApiError(error);
  }
}
