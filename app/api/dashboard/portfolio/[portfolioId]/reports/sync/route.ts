import { NextResponse } from "next/server";
import { portfolioApiError, requirePortfolioApiUser } from "@/lib/portfolio/portfolio-api";
import { syncPortfolioReports } from "@/lib/portfolio/portfolio-service";
type Context = { params: Promise<{ portfolioId: string }> };
export async function POST(_request: Request, context: Context) { try { const user = await requirePortfolioApiUser(); const { portfolioId } = await context.params; const result = await syncPortfolioReports(user, portfolioId); return NextResponse.json({ ok: true, ...result }); } catch (error) { return portfolioApiError(error); } }
