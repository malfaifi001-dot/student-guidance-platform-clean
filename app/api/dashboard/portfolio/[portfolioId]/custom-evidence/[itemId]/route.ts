import { NextResponse } from "next/server";
import { portfolioApiError, requirePortfolioApiUser } from "@/lib/portfolio/portfolio-api";
import { deleteCustomEvidence, updateCustomEvidence } from "@/lib/portfolio/portfolio-service";
import { customEvidencePatchSchema } from "@/lib/portfolio/portfolio-types";
type Context = { params: Promise<{ portfolioId: string; itemId: string }> };
export async function PATCH(request: Request, context: Context) { try { const user = await requirePortfolioApiUser(); const { portfolioId, itemId } = await context.params; const input = customEvidencePatchSchema.parse(await request.json()); await updateCustomEvidence(user, portfolioId, itemId, input); return NextResponse.json({ ok: true }); } catch (error) { return portfolioApiError(error); } }
export async function DELETE(_request: Request, context: Context) { try { const user = await requirePortfolioApiUser(); const { portfolioId, itemId } = await context.params; await deleteCustomEvidence(user, portfolioId, itemId); return NextResponse.json({ ok: true }); } catch (error) { return portfolioApiError(error); } }
