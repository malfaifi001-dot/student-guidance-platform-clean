import { NextResponse } from "next/server";

import { portfolioApiError, requirePortfolioApiUser } from "@/lib/portfolio/portfolio-api";
import { getPortfolioSnapshotPdfStatus, registerPortfolioSnapshotPdf } from "@/lib/portfolio/portfolio-snapshot-pdf-service";
import { getPortfolioSnapshot } from "@/lib/portfolio/portfolio-snapshot-service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ snapshotId: string }> }) {
  try {
    const user = await requirePortfolioApiUser();
    const snapshot = await getPortfolioSnapshot(user, (await params).snapshotId);
    return NextResponse.json({ ok: true, pdf: await getPortfolioSnapshotPdfStatus(snapshot.id, snapshot.document) });
  } catch (error) {
    return portfolioApiError(error);
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ snapshotId: string }> }) {
  try {
    const user = await requirePortfolioApiUser();
    const snapshot = await getPortfolioSnapshot(user, (await params).snapshotId);
    await registerPortfolioSnapshotPdf(snapshot.id, snapshot.document, { forceRetry: true });
    return NextResponse.json({ ok: true, pdf: await getPortfolioSnapshotPdfStatus(snapshot.id, snapshot.document) });
  } catch (error) {
    return portfolioApiError(error);
  }
}
