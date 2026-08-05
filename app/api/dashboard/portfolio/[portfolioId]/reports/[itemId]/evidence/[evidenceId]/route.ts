import { NextResponse } from "next/server";
import { portfolioApiError, requirePortfolioApiUser } from "@/lib/portfolio/portfolio-api";
import { updatePortfolioEvidencePreference } from "@/lib/portfolio/portfolio-service";
import { portfolioEvidencePatchSchema } from "@/lib/portfolio/portfolio-types";
type Context = { params: Promise<{ portfolioId: string; itemId: string; evidenceId: string }> };
export async function PATCH(request: Request, context: Context) { try { const user = await requirePortfolioApiUser(); const { portfolioId, itemId, evidenceId } = await context.params; const input = portfolioEvidencePatchSchema.parse(await request.json()); await updatePortfolioEvidencePreference(user, portfolioId, itemId, evidenceId, input); return NextResponse.json({ ok: true }); } catch (error) { return portfolioApiError(error); } }
