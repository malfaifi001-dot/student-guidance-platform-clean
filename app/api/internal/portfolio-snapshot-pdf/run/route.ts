import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { getRequestOrigin } from "@/lib/http/request-origin";
import { generatePdfFromUrlWithCloudflare } from "@/lib/pdf-export/cloudflare-browser-run-pdf";
import { assertPortfolioExportImageSourcesAvailable, createPortfolioExportToken } from "@/lib/portfolio/portfolio-export-snapshot";
import {
  claimNextPortfolioSnapshotPdfJob,
  completePortfolioSnapshotPdfJob,
  failPortfolioSnapshotPdfJob,
  portfolioSnapshotPdfStorageKey,
} from "@/lib/portfolio/portfolio-snapshot-pdf-service";
import { parsePortfolioSnapshotDocument } from "@/lib/portfolio/portfolio-snapshot-types";
import { deleteStorageFile, renameStorageFile, writeStorageFile } from "@/lib/storage/storage-provider";
import { storageKeySegments } from "@/lib/storage/storage-paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = process.env.PORTFOLIO_SNAPSHOT_PDF_RUNNER_SECRET?.trim();
  const supplied = request.headers.get("x-portfolio-pdf-runner-secret") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!expected || !supplied) return false;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

function isPdf(data: Uint8Array) {
  return data.byteLength > 5 && Buffer.from(data.subarray(0, 5)).toString("ascii") === "%PDF-";
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 });

  const job = await claimNextPortfolioSnapshotPdfJob();
  if (!job) return NextResponse.json({ ok: true, claimed: false });

  const contentHash = job.contentHash;
  const finalKey = portfolioSnapshotPdfStorageKey(job.snapshotId, contentHash);
  const tempKey = `portfolio-pdfs/snapshots/${job.snapshotId}/.${contentHash}.${job.claimToken}.tmp`;
  try {
    const document = parsePortfolioSnapshotDocument(job.snapshot.snapshotJson);
    await assertPortfolioExportImageSourcesAvailable(document);
    const token = await createPortfolioExportToken(document);
    const previewUrl = `${getRequestOrigin(request)}/portfolio-export-preview/${encodeURIComponent(token)}?pdf=1`;
    const pdf = await generatePdfFromUrlWithCloudflare({
      url: previewUrl,
      gotoWaitUntil: "domcontentloaded",
      waitForSelector: '[data-portfolio-pdf-ready="true"]',
      waitForSelectorTimeoutMs: 30_000,
      debugLabel: "portfolio",
    });
    if (!isPdf(pdf) || pdf.byteLength < 100) throw new Error("CLOUDFLARE_RETURNED_INVALID_PDF");

    await writeStorageFile(storageKeySegments(tempKey), pdf);
    await renameStorageFile(storageKeySegments(tempKey), storageKeySegments(finalKey));
    const finalized = await completePortfolioSnapshotPdfJob({
      id: job.id,
      claimToken: job.claimToken!,
      contentHash,
      storageKey: finalKey,
      byteSize: pdf.byteLength,
    });
    if (finalized.count !== 1) throw new Error("PDF_JOB_CLAIM_EXPIRED_BEFORE_FINALIZE");
    return NextResponse.json({ ok: true, claimed: true, status: "READY" });
  } catch (error) {
    await failPortfolioSnapshotPdfJob({ id: job.id, claimToken: job.claimToken!, error });
    console.error("PORTFOLIO_SNAPSHOT_PDF_JOB_FAILED", { artifactId: job.id, snapshotId: job.snapshotId, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ ok: false, claimed: true, status: "FAILED" }, { status: 500 });
  } finally {
    await deleteStorageFile(storageKeySegments(tempKey)).catch(() => undefined);
  }
}
