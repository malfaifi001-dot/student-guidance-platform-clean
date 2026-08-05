import { NextResponse } from "next/server";
import { portfolioApiError, requirePortfolioApiUser } from "@/lib/portfolio/portfolio-api";
import { movePortfolioEvidence } from "@/lib/portfolio/portfolio-service";
import { portfolioMoveSchema } from "@/lib/portfolio/portfolio-types";
type Context = { params: Promise<{ portfolioId: string; itemId: string; evidenceId: string }> };
export async function POST(request: Request, context: Context) { try { const user = await requirePortfolioApiUser(); const { portfolioId, itemId, evidenceId } = await context.params; const input = portfolioMoveSchema.parse(await request.json()); await movePortfolioEvidence(user, portfolioId, itemId, evidenceId, input.direction); return NextResponse.json({ ok: true }); } catch (error) { return portfolioApiError(error); } }
