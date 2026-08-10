import { NextResponse } from "next/server";

import { portfolioApiError, requirePortfolioApiUser } from "@/lib/portfolio/portfolio-api";
import {
  createPortfolioSnapshot,
  listPortfolioSnapshots,
} from "@/lib/portfolio/portfolio-snapshot-service";
import { portfolioSnapshotCreateSchema } from "@/lib/portfolio/portfolio-snapshot-types";

type Context = { params: Promise<{ portfolioId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requirePortfolioApiUser();
    const { portfolioId } = await context.params;
    const snapshots = await listPortfolioSnapshots(user, portfolioId);
    return NextResponse.json({ ok: true, snapshots });
  } catch (error) {
    return portfolioApiError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const user = await requirePortfolioApiUser();
    const { portfolioId } = await context.params;
    const input = portfolioSnapshotCreateSchema.parse(await request.json());
    const snapshot = await createPortfolioSnapshot(user, portfolioId, input);
    return NextResponse.json({ ok: true, snapshot }, { status: 201 });
  } catch (error) {
    return portfolioApiError(error);
  }
}
