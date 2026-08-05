import { NextResponse } from "next/server";

import { portfolioApiError, requirePortfolioApiUser } from "@/lib/portfolio/portfolio-api";
import { deletePortfolioItem, movePortfolioItem, updatePortfolioItem } from "@/lib/portfolio/portfolio-service";
import { portfolioItemPatchSchema } from "@/lib/portfolio/portfolio-types";

type Context = { params: Promise<{ portfolioId: string; itemId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requirePortfolioApiUser();
    const { portfolioId, itemId } = await context.params;
    const input = portfolioItemPatchSchema.parse(await request.json());
    if (input.action === "move") {
      await movePortfolioItem(user, portfolioId, itemId, input.direction);
    } else {
      await updatePortfolioItem(user, portfolioId, itemId, input);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return portfolioApiError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await requirePortfolioApiUser();
    const { portfolioId, itemId } = await context.params;
    await deletePortfolioItem(user, portfolioId, itemId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return portfolioApiError(error);
  }
}
