import "server-only";

import { randomUUID } from "node:crypto";
import * as mariadb from "mariadb";

import { prisma } from "@/lib/prisma";
import { hashPortfolioSnapshotDocument } from "@/lib/portfolio/portfolio-snapshot-hash";
import { storageKeySegments } from "@/lib/storage/storage-paths";

const LEASE_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 4;
const RETRY_BASE_MS = 60 * 1000;
const RATE_LIMIT_RETRY_BASE_MS = 5 * 60 * 1000;
const RETRY_MAX_MS = 60 * 60 * 1000;
const GLOBAL_LOCK_NAME = "teachix:portfolio-snapshot-pdf";

export type PortfolioSnapshotPdfClaimOperation =
  | "lock-connect"
  | "get-lock"
  | "recover-expired"
  | "find-first"
  | "claim-update"
  | "load-job";

type PortfolioSnapshotPdfClaimError = Error & {
  claimOperation?: PortfolioSnapshotPdfClaimOperation;
};

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

function errorProperty(error: unknown, property: string) {
  return error && typeof error === "object" && property in error
    ? (error as Record<string, unknown>)[property]
    : undefined;
}

function isRateLimitError(error: unknown) {
  return errorProperty(error, "status") === 429 || /\b429\b|rate limit/i.test(error instanceof Error ? error.message : String(error));
}

function nextRetryAt(attemptCount: number, error?: unknown) {
  const rateLimit = isRateLimitError(error);
  const base = rateLimit ? RATE_LIMIT_RETRY_BASE_MS : RETRY_BASE_MS;
  const exponentialDelay = base * 2 ** Math.max(0, attemptCount - 1);
  const retryAfterMs = Number(errorProperty(error, "retryAfterMs"));
  const requestedDelay = Number.isFinite(retryAfterMs) && retryAfterMs > 0
    ? retryAfterMs
    : exponentialDelay;
  const jitterMs = Math.floor(Math.random() * Math.max(1000, Math.min(base, 30 * 1000)));
  return new Date(Date.now() + Math.min(Math.max(requestedDelay, exponentialDelay) + jitterMs, RETRY_MAX_MS));
}

type PortfolioSnapshotPdfGlobalLock = {
  release: () => Promise<void>;
};

function ensureDatabaseUrlSearchParam(url: URL, key: string, value: string) {
  if (!url.searchParams.has(key)) {
    url.searchParams.set(key, value);
  }
}

function portfolioSnapshotPdfLockConnectionUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);

  // PrismaMariaDb rewrites mysql:// to mariadb:// before passing the URL
  // to the MariaDB connector. The dedicated advisory-lock connection must
  // use the same compatible protocol and connection options.
  if (url.protocol === "mysql:") {
    url.protocol = "mariadb:";
  } else if (url.protocol !== "mariadb:") {
    throw new Error("UNSUPPORTED_DATABASE_PROTOCOL");
  }

  ensureDatabaseUrlSearchParam(url, "acquireTimeout", process.env.PRISMA_POOL_TIMEOUT_MS || "30000");
  ensureDatabaseUrlSearchParam(url, "connectTimeout", process.env.PRISMA_CONNECT_TIMEOUT_MS || "15000");
  ensureDatabaseUrlSearchParam(url, "allowPublicKeyRetrieval", "true");
  ensureDatabaseUrlSearchParam(url, "prepareCacheLength", "0");

  return url.toString();
}

function annotateClaimError(error: unknown, claimOperation: PortfolioSnapshotPdfClaimOperation) {
  if (error instanceof Error) {
    Object.defineProperty(error, "claimOperation", {
      configurable: true,
      value: claimOperation,
    });
    return error;
  }

  const wrapped = new Error("Portfolio snapshot PDF claim failed");
  Object.defineProperty(wrapped, "claimOperation", {
    configurable: true,
    value: claimOperation,
  });
  return wrapped;
}

async function acquirePortfolioSnapshotPdfGlobalLock(): Promise<PortfolioSnapshotPdfGlobalLock | null> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not defined");

  let claimOperation: PortfolioSnapshotPdfClaimOperation = "lock-connect";
  let connection: mariadb.Connection | undefined;
  try {
    connection = await mariadb.createConnection(portfolioSnapshotPdfLockConnectionUrl(databaseUrl));
  } catch (error) {
    throw annotateClaimError(error, claimOperation);
  }

  let acquired = false;
  try {
    claimOperation = "get-lock";
    const rows = await connection.query("SELECT GET_LOCK(?, 0) AS acquired", [GLOBAL_LOCK_NAME]);
    acquired = Number(rows[0]?.acquired) === 1;
    if (!acquired) {
      await connection.end();
      return null;
    }

    let released = false;
    return {
      release: async () => {
        if (released) return;
        released = true;
        try {
          await connection.query("SELECT RELEASE_LOCK(?)", [GLOBAL_LOCK_NAME]);
        } finally {
          await connection.end();
        }
      },
    };
  } catch (error) {
    if (acquired) await connection.query("SELECT RELEASE_LOCK(?)", [GLOBAL_LOCK_NAME]).catch(() => undefined);
    await connection.end().catch(() => undefined);
    throw annotateClaimError(error, claimOperation);
  }
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
  let claimOperation: PortfolioSnapshotPdfClaimOperation = "lock-connect";
  let globalLock: PortfolioSnapshotPdfGlobalLock | null;
  try {
    globalLock = await acquirePortfolioSnapshotPdfGlobalLock();
  } catch (error) {
    throw annotateClaimError(
      error,
      (error as PortfolioSnapshotPdfClaimError).claimOperation ?? claimOperation,
    );
  }
  if (!globalLock) return { kind: "GLOBAL_BUSY" as const };

  const releaseOnClaimFailure = async () => globalLock.release().catch(() => undefined);
  try {
    claimOperation = "recover-expired";
    await recoverExpiredPortfolioSnapshotPdfJobs();
    const now = new Date();
    claimOperation = "find-first";
    const candidate = await prisma.portfolioSnapshotPdfArtifact.findFirst({
      where: {
        status: "PENDING",
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
      },
      orderBy: { createdAt: "asc" },
    });
    if (!candidate) {
      await releaseOnClaimFailure();
      return { kind: "NO_ELIGIBLE_JOB" as const };
    }

    const claimToken = randomUUID();
    claimOperation = "claim-update";
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
    if (claimed.count !== 1) {
      await releaseOnClaimFailure();
      return { kind: "CLAIM_CONFLICT" as const };
    }

    claimOperation = "load-job";
    const job = await prisma.portfolioSnapshotPdfArtifact.findUnique({
      where: { id: candidate.id },
      include: { snapshot: { select: { id: true, snapshotJson: true } } },
    });
    if (!job) {
      await releaseOnClaimFailure();
      return { kind: "CLAIM_CONFLICT" as const };
    }
    return { kind: "CLAIMED" as const, job, releaseGlobalLock: globalLock.release };
  } catch (error) {
    await releaseOnClaimFailure();
    throw annotateClaimError(
      error,
      (error as PortfolioSnapshotPdfClaimError).claimOperation ?? claimOperation,
    );
  }
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
          nextAttemptAt: nextRetryAt(current.attemptCount, input.error),
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
