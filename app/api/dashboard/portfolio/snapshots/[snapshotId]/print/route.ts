import { NextResponse } from "next/server";

import { portfolioApiError, requirePortfolioApiUser } from "@/lib/portfolio/portfolio-api";
import { createPortfolioExportToken } from "@/lib/portfolio/portfolio-export-snapshot";
import { getPortfolioSnapshot } from "@/lib/portfolio/portfolio-snapshot-service";
import { buildPortfolioPrintRedirectPath } from "@/lib/print-export/portfolio-print-entry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Authorized short-lived entry point for the isolated Portfolio print page. */
export async function GET(request: Request, { params }: { params: Promise<{ snapshotId: string }> }) {
  try {
    const user = await requirePortfolioApiUser();
    const { snapshotId } = await params;
    const snapshot = await getPortfolioSnapshot(user, snapshotId);
    const token = await createPortfolioExportToken(snapshot.document, { snapshotId: snapshot.id });
    // Keep this Location relative. The incoming server URL may contain a
    // listening address such as 0.0.0.0, which must never be sent to a browser.
    return new Response(null, {
      status: 303,
      headers: {
        "Cache-Control": "private, no-store",
        Location: buildPortfolioPrintRedirectPath(token),
      },
    });
  } catch (error) {
    return portfolioApiError(error);
  }
}
