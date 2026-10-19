import "server-only";

import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { hashPortfolioSnapshotDocument } from "@/lib/portfolio/portfolio-snapshot-hash";
import { storageKeySegments } from "@/lib/storage/storage-paths";

const LEASE_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 4;
const RETRY_BASE_MS = 60 * 1000;

export const PORTFOLIO_SNAPSHOT_PDF_MAX_ATTEMPTS = MAX_ATTEMPTS;

export function portfolioSnapshotPdfStorageKey(snapshotId: string, contentHash: string) {
  return `portfolio-pdfs/snapshots/${snapshotId}/${contentHash}.pdf`;
}

export function portfolioSnapshotPdfStorageSegments(snapshotId: string, contentHash: string) {
  return storageKeySegments(portfolioSnapshotPdfStorageKey(snapshotId, contentHash));
}

function sanitizeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/https?:\/\/[^\s"'<>]+/gi, "[redacted-url]")
    .replace(/token=[^&\s]+/gi, "token=[redacted]")
    .replace(/[\r\n]+/g, " ")
    .slice(0, 1000);
}

function nextRetryAt(attemptCount: number) {
  const delay = RETRY_BASE_MS * 2 ** Math.max(0, attemptCount - 1);
  return new Date(Date.now() + Math.min(delay, 30 * 60 * 1000));
}

export async function registerPortfolioSnapshotPdf(snapshotId: string, document: unknown, options?: { forceRetry?: boolean }) {
  const contentHash = hashPortfolioSnapshotDocument(document);
  const existing = await prisma.portfolioSnapshotPdfArtifact.findUnique({
    where: { snapshotId },
    select: { id: true, contentHash: true, status: true },
  });

  if (existing?.contentHash === contentHash && !options?.forceRetry) return existing;

  return prisma.portfolioSnapshotPdfArtifact.upsert({
    where: { snapshotId },
    update: {
      contentHash,
      status: "PENDING",
      attemptCount: options?.forceRetry || existing?.contentHash !== contentHash ? 0 : undefined,
      storageKey: null,
      byteSize: null,
      nextAttemptAt: null,
      leaseExpiresAt: null,
      claimToken: null,
      lastError: null,
      generatedAt: null,
    },
    create: { snapshotId, contentHash },
    select: { id: true, contentHash: true, status: true },
  });
}

export async function recoverExpiredPortfolioSnapshotPdfJobs() {
  return prisma.portfolioSnapshotPdfArtifact.updateMany({
    where: { status: "PROCESSING", leaseExpiresAt: { lte: new Date() } },
    data: { status: "PENDING", claimToken: null, leaseExpiresAt: null, nextAttemptAt: new Date() },
  });
}

export async function claimNextPortfolioSnapshotPdfJob() {
  await recoverExpiredPortfolioSnapshotPdfJobs();
  const now = new Date();
  const candidate = await prisma.portfolioSnapshotPdfArtifact.findFirst({
    where: {
      status: "PENDING",
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
    },
    orderBy: { createdAt: "asc" },
  });
  if (!candidate) return { kind: "NO_ELIGIBLE_JOB" as const };

  const claimToken = randomUUID();
  const claimed = await prisma.portfolioSnapshotPdfArtifact.updateMany({
    where: { id: candidate.id, status: "PENDING", contentHash: candidate.contentHash },
    data: {
      status: "PROCESSING",
      claimToken,
      leaseExpiresAt: new Date(Date.now() + LEASE_MS),
      attemptCount: { increment: 1 },
      lastError: null,
    },
  });
  if (claimed.count !== 1) return { kind: "CLAIM_CONFLICT" as const };

  const job = await prisma.portfolioSnapshotPdfArtifact.findUnique({
    where: { id: candidate.id },
    include: { snapshot: { select: { id: true, snapshotJson: true } } },
  });
  if (!job) return { kind: "CLAIM_CONFLICT" as const };
  return { kind: "CLAIMED" as const, job };
}

export async function completePortfolioSnapshotPdfJob(input: {
  id: string;
  claimToken: string;
  contentHash: string;
  storageKey: string;
  byteSize: number;
}) {
  return prisma.portfolioSnapshotPdfArtifact.updateMany({
    where: { id: input.id, status: "PROCESSING", claimToken: input.claimToken, contentHash: input.contentHash },
    data: {
      status: "READY",
      storageKey: input.storageKey,
      byteSize: input.byteSize,
      leaseExpiresAt: null,
      claimToken: null,
      lastError: null,
      generatedAt: new Date(),
    },
  });
}

export async function failPortfolioSnapshotPdfJob(input: { id: string; claimToken: string; error: unknown }) {
  const current = await prisma.portfolioSnapshotPdfArtifact.findFirst({
    where: { id: input.id, status: "PROCESSING", claimToken: input.claimToken },
    select: { attemptCount: true },
  });
  if (!current) return { count: 0, retryable: false };

  const retryable = current.attemptCount < MAX_ATTEMPTS;
  const result = await prisma.portfolioSnapshotPdfArtifact.updateMany({
    where: { id: input.id, status: "PROCESSING", claimToken: input.claimToken },
    data: retryable
      ? {
          status: "PENDING",
          nextAttemptAt: nextRetryAt(current.attemptCount),
          leaseExpiresAt: null,
          claimToken: null,
          lastError: sanitizeError(input.error),
        }
      : {
          status: "FAILED",
          nextAttemptAt: null,
          leaseExpiresAt: null,
          claimToken: null,
          lastError: sanitizeError(input.error),
        },
  });
  return { count: result.count, retryable };
}

export async function getPortfolioSnapshotPdfArtifact(snapshotId: string, document: unknown) {
  const contentHash = hashPortfolioSnapshotDocument(document);
  return prisma.portfolioSnapshotPdfArtifact.findFirst({
    where: { snapshotId, contentHash, status: "READY", storageKey: portfolioSnapshotPdfStorageKey(snapshotId, contentHash) },
    select: { storageKey: true, byteSize: true, generatedAt: true },
  });
}

export async function getPortfolioSnapshotPdfStatus(snapshotId: string, document: unknown) {
  const contentHash = hashPortfolioSnapshotDocument(document);
  const artifact = await prisma.portfolioSnapshotPdfArtifact.findUnique({
    where: { snapshotId },
    select: { contentHash: true, status: true, byteSize: true, generatedAt: true, attemptCount: true },
  });
  if (!artifact || artifact.contentHash !== contentHash) return { exists: false, status: "PENDING" as const, attemptCount: 0 };
  return { exists: true, ...artifact };
}
