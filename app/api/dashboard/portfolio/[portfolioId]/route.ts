import { NextResponse } from "next/server";

import { portfolioApiError, requirePortfolioApiUser } from "@/lib/portfolio/portfolio-api";
import { getPortfolioWorkspace } from "@/lib/portfolio/portfolio-read-model";
import { updatePortfolioContent, updatePortfolioSettings } from "@/lib/portfolio/portfolio-service";
import { portfolioPatchSchema } from "@/lib/portfolio/portfolio-types";

type Context = { params: Promise<{ portfolioId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requirePortfolioApiUser();
    const { portfolioId } = await context.params;
    const workspace = await getPortfolioWorkspace(user, portfolioId);
    return NextResponse.json(workspace);
  } catch (error) {
    return portfolioApiError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requirePortfolioApiUser();
    const { portfolioId } = await context.params;
    const input = portfolioPatchSchema.parse(await request.json());

    if (input.operation === "settings") {
      await updatePortfolioSettings(user, portfolioId, input);
    } else {
      await updatePortfolioContent(user, portfolioId, input);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return portfolioApiError(error);
  }
}
