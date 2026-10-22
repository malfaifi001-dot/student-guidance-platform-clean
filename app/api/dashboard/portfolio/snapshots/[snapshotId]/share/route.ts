import { NextResponse } from "next/server";

import { portfolioApiError, requirePortfolioApiUser } from "@/lib/portfolio/portfolio-api";
import { createOrGetPortfolioSnapshotShare } from "@/lib/portfolio/portfolio-snapshot-share-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ snapshotId: string }> }) {
  try {
    const user = await requirePortfolioApiUser();
    const { snapshotId } = await params;
    const share = await createOrGetPortfolioSnapshotShare(user, snapshotId);
    return NextResponse.json({ ok: true, share }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return portfolioApiError(error);
  }
}
