import { NextResponse } from "next/server";

import { portfolioApiError, requirePortfolioApiUser } from "@/lib/portfolio/portfolio-api";
import { updatePortfolioSection } from "@/lib/portfolio/portfolio-service";
import { portfolioSectionPatchSchema } from "@/lib/portfolio/portfolio-types";

type Context = { params: Promise<{ portfolioId: string; sectionId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requirePortfolioApiUser();
    const { portfolioId, sectionId } = await context.params;
    const input = portfolioSectionPatchSchema.parse(await request.json());
    await updatePortfolioSection(user, portfolioId, sectionId, input.isEnabled);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return portfolioApiError(error);
  }
}
