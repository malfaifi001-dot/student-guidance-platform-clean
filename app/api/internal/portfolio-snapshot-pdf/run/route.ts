import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

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

function logPortfolioSnapshotPdf(event: string, details: Record<string, unknown>) {
  console.info(`PORTFOLIO_SNAPSHOT_PDF ${JSON.stringify({ event, ...details })}`);
}

function publicPortfolioOrigin() {
  const configured = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.SITE_URL?.trim();
  const raw = configured || (process.env.NODE_ENV === "production" ? "https://teachix.sa" : "");
  if (!raw) throw new Error("PORTFOLIO_PUBLIC_ORIGIN_NOT_CONFIGURED");

  const origin = new URL(raw);
  const hostname = origin.hostname.toLowerCase();
  const localOrPrivateHost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".local") ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(?:1[6-9]|2\d|3[0-1])\./.test(hostname) ||
    hostname.startsWith("169.254.");
  const productionHostAllowed = process.env.NODE_ENV !== "production" || hostname === "teachix.sa" || hostname === "www.teachix.sa";
  if (origin.protocol !== "https:" || localOrPrivateHost || !productionHostAllowed) throw new Error("PORTFOLIO_PUBLIC_ORIGIN_NOT_REACHABLE");
  return origin.origin;
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 });

  const runnerStartedAt = Date.now();
  let stage = "claim";
  let claimResult: Awaited<ReturnType<typeof claimNextPortfolioSnapshotPdfJob>>;
  try {
    claimResult = await claimNextPortfolioSnapshotPdfJob();
  } catch (error) {
    logPortfolioSnapshotPdf("claim-failed", { stage, durationMs: Date.now() - runnerStartedAt, errorClass: error instanceof Error ? error.constructor.name : "UnknownError" });
    return NextResponse.json({ ok: false, claimed: false, reason: "CLAIM_QUERY_FAILED" }, { status: 500 });
  }

  if (claimResult.kind === "NO_ELIGIBLE_JOB") {
    logPortfolioSnapshotPdf("claim-empty", { stage, durationMs: Date.now() - runnerStartedAt });
    return NextResponse.json({ ok: true, claimed: false, reason: "NO_ELIGIBLE_JOB" });
  }
  if (claimResult.kind === "CLAIM_CONFLICT") {
    logPortfolioSnapshotPdf("claim-conflict", { stage, durationMs: Date.now() - runnerStartedAt });
    return NextResponse.json({ ok: false, claimed: false, reason: "CLAIM_CONFLICT" }, { status: 409 });
  }

  const job = claimResult.job;
  logPortfolioSnapshotPdf("claimed", { stage, durationMs: Date.now() - runnerStartedAt });

  const contentHash = job.contentHash;
  const finalKey = portfolioSnapshotPdfStorageKey(job.snapshotId, contentHash);
  const tempKey = `portfolio-pdfs/snapshots/${job.snapshotId}/.${contentHash}.${job.claimToken}.tmp`;
  try {
    stage = "snapshot-load";
    const document = parsePortfolioSnapshotDocument(job.snapshot.snapshotJson);
    stage = "image-preflight";
    await assertPortfolioExportImageSourcesAvailable(document);
    stage = "export-token";
    const token = await createPortfolioExportToken(document);
    stage = "public-origin";
    const previewUrl = `${publicPortfolioOrigin()}/portfolio-export-preview/${encodeURIComponent(token)}?pdf=1`;
    stage = "cloudflare";
    const pdf = await generatePdfFromUrlWithCloudflare({
      url: previewUrl,
      gotoWaitUntil: "domcontentloaded",
      waitForSelector: '[data-portfolio-pdf-ready="true"]',
      waitForSelectorTimeoutMs: 30_000,
      debugLabel: "portfolio",
    });
    if (!isPdf(pdf) || pdf.byteLength < 100) throw new Error("CLOUDFLARE_RETURNED_INVALID_PDF");

    stage = "storage-write";
    await writeStorageFile(storageKeySegments(tempKey), pdf);
    stage = "storage-publish";
    await renameStorageFile(storageKeySegments(tempKey), storageKeySegments(finalKey));
    stage = "finalize";
    const finalized = await completePortfolioSnapshotPdfJob({
      id: job.id,
      claimToken: job.claimToken!,
      contentHash,
      storageKey: finalKey,
      byteSize: pdf.byteLength,
    });
    if (finalized.count !== 1) throw new Error("PDF_JOB_CLAIM_EXPIRED_BEFORE_FINALIZE");
    logPortfolioSnapshotPdf("ready", { stage, durationMs: Date.now() - runnerStartedAt, byteSize: pdf.byteLength });
    return NextResponse.json({ ok: true, claimed: true, status: "READY" });
  } catch (error) {
    const failure = await failPortfolioSnapshotPdfJob({ id: job.id, claimToken: job.claimToken!, error });
    logPortfolioSnapshotPdf("failed", { stage, durationMs: Date.now() - runnerStartedAt, errorClass: error instanceof Error ? error.constructor.name : "UnknownError", retryable: failure.retryable });
    return NextResponse.json({ ok: false, claimed: true, status: failure.retryable ? "PENDING" : "FAILED" }, { status: 500 });
  } finally {
    await deleteStorageFile(storageKeySegments(tempKey)).catch(() => undefined);
  }
}
