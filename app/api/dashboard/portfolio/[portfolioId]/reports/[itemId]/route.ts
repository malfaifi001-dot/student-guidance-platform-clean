import { NextResponse } from "next/server";
import { portfolioApiError, requirePortfolioApiUser } from "@/lib/portfolio/portfolio-api";
import { setPortfolioReportVisibility } from "@/lib/portfolio/portfolio-service";
import { portfolioReportVisibilitySchema } from "@/lib/portfolio/portfolio-types";
type Context = { params: Promise<{ portfolioId: string; itemId: string }> };
export async function PATCH(request: Request, context: Context) { try { const user = await requirePortfolioApiUser(); const { portfolioId, itemId } = await context.params; const input = portfolioReportVisibilitySchema.parse(await request.json()); await setPortfolioReportVisibility(user, portfolioId, itemId, input.isVisible); return NextResponse.json({ ok: true }); } catch (error) { return portfolioApiError(error); } }
