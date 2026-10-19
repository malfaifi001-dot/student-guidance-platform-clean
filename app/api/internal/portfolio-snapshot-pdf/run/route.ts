import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { generatePdfFromUrlWithCloudflare } from "@/lib/pdf-export/cloudflare-browser-run-pdf";
import { assertPortfolioExportImageSourcesAvailable, createPortfolioExportToken } from "@/lib/portfolio/portfolio-export-snapshot";
import {
  claimNextPortfolioSnapshotPdfJob,
  completePortfolioSnapshotPdfJob,
  failPortfolioSnapshotPdfJob,
  portfolioSnapshotPdfStorageKey,
  type PortfolioSnapshotPdfClaimOperation,
} from "@/lib/portfolio/portfolio-snapshot-pdf-service";
import { parsePortfolioSnapshotDocument } from "@/lib/portfolio/portfolio-snapshot-types";
import { deleteStorageFile, readStorageFile, renameStorageFile, storageFileExists, writeStorageFile } from "@/lib/storage/storage-provider";
import { storageKeySegments } from "@/lib/storage/storage-paths";
import { getPortfolioPublicOrigin } from "@/lib/portfolio/portfolio-public-origin";

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

const claimOperations = new Set<PortfolioSnapshotPdfClaimOperation>([
  "lock-connect",
  "get-lock",
  "recover-expired",
  "find-first",
  "claim-update",
  "load-job",
]);

function safeClaimErrorDetails(error: unknown) {
  const candidate = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const operation = candidate.claimOperation;
  const errorName = error instanceof Error ? error.name : "UnknownError";
  const errorCode = candidate.code;
  const errno = candidate.errno;
  const sqlState = candidate.sqlState;

  return {
    claimOperation: typeof operation === "string" && claimOperations.has(operation as PortfolioSnapshotPdfClaimOperation)
      ? operation
      : "unknown",
    errorName: /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/.test(errorName) ? errorName : "UnknownError",
    errorCode: typeof errorCode === "string" && /^[A-Za-z0-9_.:-]{1,64}$/.test(errorCode) ? errorCode : null,
    errno: typeof errno === "number" && Number.isInteger(errno) && Math.abs(errno) <= 999999 ? errno : null,
    sqlState: typeof sqlState === "string" && /^[A-Z0-9]{5}$/.test(sqlState) ? sqlState : null,
  };
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 });

  const runnerStartedAt = Date.now();
  let stage = "claim";
  let claimResult: Awaited<ReturnType<typeof claimNextPortfolioSnapshotPdfJob>>;
  try {
    claimResult = await claimNextPortfolioSnapshotPdfJob();
  } catch (error) {
    logPortfolioSnapshotPdf("claim-failed", {
      stage,
      durationMs: Date.now() - runnerStartedAt,
      ...safeClaimErrorDetails(error),
    });
    return NextResponse.json({ ok: false, claimed: false, reason: "CLAIM_QUERY_FAILED" }, { status: 500 });
  }

  if (claimResult.kind === "NO_ELIGIBLE_JOB") {
    logPortfolioSnapshotPdf("claim-empty", { stage, durationMs: Date.now() - runnerStartedAt });
    return NextResponse.json({ ok: true, claimed: false, reason: "NO_ELIGIBLE_JOB" });
  }
  if (claimResult.kind === "GLOBAL_BUSY") {
    logPortfolioSnapshotPdf("claim-busy", { stage, durationMs: Date.now() - runnerStartedAt });
    return NextResponse.json({ ok: true, claimed: false, reason: "GLOBAL_PDF_BUSY" }, { status: 202 });
  }
  if (claimResult.kind === "CLAIM_CONFLICT") {
    logPortfolioSnapshotPdf("claim-conflict", { stage, durationMs: Date.now() - runnerStartedAt });
    return NextResponse.json({ ok: false, claimed: false, reason: "CLAIM_CONFLICT" }, { status: 409 });
  }

  const job = claimResult.job;
  const releaseGlobalLock = claimResult.releaseGlobalLock;
  logPortfolioSnapshotPdf("claimed", { stage, durationMs: Date.now() - runnerStartedAt });

  const contentHash = job.contentHash;
  const finalKey = portfolioSnapshotPdfStorageKey(job.snapshotId, contentHash);
  const tempKey = `portfolio-pdfs/snapshots/${job.snapshotId}/.${contentHash}.${job.claimToken}.tmp`;
  try {
    stage = "snapshot-load";
    const document = parsePortfolioSnapshotDocument(job.snapshot.snapshotJson);
    stage = "image-preflight";
    await assertPortfolioExportImageSourcesAvailable(document);
    stage = "existing-artifact";
    if (await storageFileExists(storageKeySegments(finalKey))) {
      const existingPdf = await readStorageFile(storageKeySegments(finalKey));
      if (isPdf(existingPdf) && existingPdf.byteLength >= 100) {
        const finalized = await completePortfolioSnapshotPdfJob({
          id: job.id,
          claimToken: job.claimToken!,
          contentHash,
          storageKey: finalKey,
          byteSize: existingPdf.byteLength,
        });
        if (finalized.count !== 1) throw new Error("PDF_JOB_CLAIM_EXPIRED_BEFORE_FINALIZE");
        logPortfolioSnapshotPdf("ready-existing", { stage, durationMs: Date.now() - runnerStartedAt, byteSize: existingPdf.byteLength });
        return NextResponse.json({ ok: true, claimed: true, status: "READY" });
      }
      await deleteStorageFile(storageKeySegments(finalKey));
    }
    stage = "export-token";
    const token = await createPortfolioExportToken(document);
    stage = "public-origin";
    const previewUrl = `${getPortfolioPublicOrigin()}/portfolio-export-preview/${encodeURIComponent(token)}?pdf=1`;
    stage = "cloudflare";
    const pdf = await generatePdfFromUrlWithCloudflare({
      url: previewUrl,
      gotoWaitUntil: "domcontentloaded",
      waitForSelector: '[data-portfolio-pdf-ready="true"]',
      waitForSelectorTimeoutMs: 60_000,
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
    await releaseGlobalLock().catch(() => undefined);
  }
}
