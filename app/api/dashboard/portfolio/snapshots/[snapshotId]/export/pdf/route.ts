import { createReadStream } from "node:fs";
import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { portfolioApiError, requirePortfolioApiUser } from "@/lib/portfolio/portfolio-api";
import { getPortfolioSnapshotPdfArtifact, getPortfolioSnapshotPdfStatus, registerPortfolioSnapshotPdf } from "@/lib/portfolio/portfolio-snapshot-pdf-service";
import { getPortfolioSnapshot } from "@/lib/portfolio/portfolio-snapshot-service";
import { resolveStorageFile, storageFileExists } from "@/lib/storage/storage-provider";
import { storageKeySegments } from "@/lib/storage/storage-paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pdfFileName(title: string) {
  const safe = title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
  return `${safe || "portfolio-snapshot"}.pdf`;
}

function preparationResponse(status: string, attemptCount: number) {
  return NextResponse.json({ ok: false, status, attemptCount }, { status: status === "FAILED" ? 409 : 202 });
}

export async function GET(_request: Request, { params }: { params: Promise<{ snapshotId: string }> }) {
  try {
    const user = await requirePortfolioApiUser();
    const { snapshotId } = await params;
    const snapshot = await getPortfolioSnapshot(user, snapshotId);
    let status = await getPortfolioSnapshotPdfStatus(snapshot.id, snapshot.document);
    if (!status.exists) {
      await registerPortfolioSnapshotPdf(snapshot.id, snapshot.document);
      status = await getPortfolioSnapshotPdfStatus(snapshot.id, snapshot.document);
    }
    if (status.status !== "READY") return preparationResponse(status.status, status.attemptCount);

    const artifact = await getPortfolioSnapshotPdfArtifact(snapshot.id, snapshot.document);
    if (!artifact?.storageKey || !(await storageFileExists(storageKeySegments(artifact.storageKey)))) {
      await registerPortfolioSnapshotPdf(snapshot.id, snapshot.document, { forceRetry: true });
      return preparationResponse("PENDING", status.attemptCount);
    }

    const filePath = resolveStorageFile(storageKeySegments(artifact.storageKey));
    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
    return new Response(stream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="portfolio.pdf"; filename*=UTF-8''${encodeURIComponent(pdfFileName(snapshot.name))}`,
        ...(artifact.byteSize ? { "Content-Length": String(artifact.byteSize) } : {}),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return portfolioApiError(error);
  }
}
