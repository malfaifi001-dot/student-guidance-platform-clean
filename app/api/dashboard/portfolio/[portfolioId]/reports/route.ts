import { NextResponse } from "next/server";
import { portfolioApiError, requirePortfolioApiUser } from "@/lib/portfolio/portfolio-api";
import { loadManagedPortfolioReports } from "@/lib/portfolio/portfolio-service";
type Context = { params: Promise<{ portfolioId: string }> };
export async function GET(_request: Request, context: Context) { try { const user = await requirePortfolioApiUser(); const { portfolioId } = await context.params; return NextResponse.json({ ok: true, reports: await loadManagedPortfolioReports(user, portfolioId) }); } catch (error) { return portfolioApiError(error); } }
