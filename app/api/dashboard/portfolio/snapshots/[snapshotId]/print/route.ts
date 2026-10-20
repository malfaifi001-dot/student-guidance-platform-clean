import { NextResponse } from "next/server";

import { portfolioApiError, requirePortfolioApiUser } from "@/lib/portfolio/portfolio-api";
import { createPortfolioExportToken } from "@/lib/portfolio/portfolio-export-snapshot";
import { getPortfolioSnapshot } from "@/lib/portfolio/portfolio-snapshot-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Authorized short-lived entry point for the isolated Portfolio print page. */
export async function GET(request: Request, { params }: { params: Promise<{ snapshotId: string }> }) {
  try {
    const user = await requirePortfolioApiUser();
    const { snapshotId } = await params;
    const snapshot = await getPortfolioSnapshot(user, snapshotId);
    const token = await createPortfolioExportToken(snapshot.document, { snapshotId: snapshot.id });
    const previewUrl = new URL(`/portfolio-export-preview/${encodeURIComponent(token)}`, request.url);
    previewUrl.searchParams.set("print", "1");
    return NextResponse.redirect(previewUrl, 303);
  } catch (error) {
    return portfolioApiError(error);
  }
}
