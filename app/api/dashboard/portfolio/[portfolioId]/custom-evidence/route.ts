import { NextResponse } from "next/server";
import { portfolioApiError, requirePortfolioApiUser } from "@/lib/portfolio/portfolio-api";
import { createCustomEvidence, loadCustomEvidence } from "@/lib/portfolio/portfolio-service";
import { customEvidenceCreateSchema } from "@/lib/portfolio/portfolio-types";
type Context = { params: Promise<{ portfolioId: string }> };
export async function GET(_request: Request, context: Context) { try { const user = await requirePortfolioApiUser(); const { portfolioId } = await context.params; return NextResponse.json({ ok: true, items: await loadCustomEvidence(user, portfolioId) }); } catch (error) { return portfolioApiError(error); } }
export async function POST(request: Request, context: Context) { try { const user = await requirePortfolioApiUser(); const { portfolioId } = await context.params; const input = customEvidenceCreateSchema.parse(await request.json()); const item = await createCustomEvidence(user, portfolioId, input); return NextResponse.json({ ok: true, item }, { status: 201 }); } catch (error) { return portfolioApiError(error); } }
