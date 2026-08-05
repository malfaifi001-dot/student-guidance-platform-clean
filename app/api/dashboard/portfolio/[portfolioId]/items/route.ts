import { NextResponse } from "next/server";

import { portfolioApiError, requirePortfolioApiUser } from "@/lib/portfolio/portfolio-api";
import { createPortfolioItem } from "@/lib/portfolio/portfolio-service";
import { portfolioItemCreateSchema } from "@/lib/portfolio/portfolio-types";

type Context = { params: Promise<{ portfolioId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await requirePortfolioApiUser();
    const { portfolioId } = await context.params;
    const input = portfolioItemCreateSchema.parse(await request.json());
    const item = await createPortfolioItem(user, portfolioId, input);
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    return portfolioApiError(error);
  }
}
