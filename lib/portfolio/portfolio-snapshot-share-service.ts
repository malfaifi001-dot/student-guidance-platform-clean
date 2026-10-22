import "server-only";

import crypto, { createCipheriv, createDecipheriv } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { getPortfolioSnapshot } from "@/lib/portfolio/portfolio-snapshot-service";
import type { PortfolioActor } from "@/lib/portfolio/portfolio-authorization";
import type { PortfolioSnapshotDocumentV1 } from "@/lib/portfolio/portfolio-snapshot-types";
import { parsePortfolioSnapshotDocument } from "@/lib/portfolio/portfolio-snapshot-types";
import { buildPortfolioSnapshotSharePath, isValidPortfolioSnapshotShareToken } from "@/lib/portfolio/portfolio-snapshot-share-contract";

function clean(value: unknown) {
  return String(value || "").trim();
}

export function hashPortfolioSnapshotShareToken(token: string) {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

function createToken() {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, tokenHash: hashPortfolioSnapshotShareToken(token), encryptedToken: encryptToken(token) };
}

function encryptionKey() {
  const configured = process.env.PORTFOLIO_SHARE_TOKEN_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (process.env.NODE_ENV === "production" && (!configured || configured.trim().length < 32)) {
    throw new Error("PORTFOLIO_SHARE_TOKEN_ENCRYPTION_KEY or NEXTAUTH_SECRET is required in production.");
  }
  return crypto.createHash("sha256").update(String(configured || "development-only-portfolio-share-key"), "utf8").digest();
}

function encryptToken(token: string) {
  const iv = crypto.randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, encrypted, cipher.getAuthTag()].map((part) => part.toString("base64url")).join(".");
}

function decryptToken(value: string) {
  const [ivValue, encryptedValue, tagValue] = value.split(".");
  if (!ivValue || !encryptedValue || !tagValue) throw new Error("PORTFOLIO_SHARE_TOKEN_INVALID");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
}

export function resolvePortfolioShareOrigin() {
  const configured = clean(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.SITE_URL).replace(/\/+$/, "");
  const raw = configured || (process.env.NODE_ENV === "production" ? "https://teachix.sa" : "http://localhost:3000");
  const origin = new URL(raw);
  const hostname = origin.hostname.toLowerCase();
  const allowedProductionHost = hostname === "teachix.sa" || hostname === "www.teachix.sa";
  const localHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";

  if (origin.username || origin.password || !["http:", "https:"].includes(origin.protocol) || (process.env.NODE_ENV === "production" && (!allowedProductionHost || origin.protocol !== "https:")) || (process.env.NODE_ENV !== "production" && !localHost && origin.protocol !== "https:")) {
    throw new Error("PORTFOLIO_SHARE_ORIGIN_INVALID");
  }

  return origin.origin;
}

export function buildPortfolioSnapshotShareUrl(token: string) {
  return `${resolvePortfolioShareOrigin()}${buildPortfolioSnapshotSharePath(token)}`;
}

export async function createOrGetPortfolioSnapshotShare(user: PortfolioActor, snapshotId: string) {
  const snapshot = await getPortfolioSnapshot(user, snapshotId);
  const existing = await prisma.portfolioSnapshotShare.findUnique({
    where: { snapshotId: snapshot.id },
    select: { id: true, encryptedToken: true, revokedAt: true },
  });

  if (existing && !existing.revokedAt) {
    return { ...shareMetadata(snapshot.document), shareId: existing.id, url: buildPortfolioSnapshotShareUrl(decryptToken(existing.encryptedToken)) };
  }

  const { token, tokenHash, encryptedToken } = createToken();
  if (existing) {
    const restored = await prisma.portfolioSnapshotShare.update({ where: { id: existing.id }, data: { tokenHash, encryptedToken, revokedAt: null }, select: { id: true } });
    return { ...shareMetadata(snapshot.document), shareId: restored.id, url: buildPortfolioSnapshotShareUrl(token) };
  }
  let share: { id: string };
  try {
    share = await prisma.portfolioSnapshotShare.create({
      data: { snapshotId: snapshot.id, tokenHash, encryptedToken },
      select: { id: true },
    });
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "P2002")) throw error;
    const concurrent = await prisma.portfolioSnapshotShare.findUniqueOrThrow({ where: { snapshotId: snapshot.id }, select: { id: true, encryptedToken: true } });
    return { ...shareMetadata(snapshot.document), shareId: concurrent.id, url: buildPortfolioSnapshotShareUrl(decryptToken(concurrent.encryptedToken)) };
  }
  return { ...shareMetadata(snapshot.document), shareId: share.id, url: buildPortfolioSnapshotShareUrl(token) };
}

function shareMetadata(document: PortfolioSnapshotDocumentV1) {
  return {
    title: document.portfolio.title,
    teacherName: document.owner.name,
    jobTitle: document.owner.jobTitle,
    schoolName: document.school.name,
    academicYear: document.portfolio.academicYear || document.school.academicYear || "",
    term: document.portfolio.term || document.school.currentSemester || "",
  };
}

export async function getPublicPortfolioSnapshotShare(token: string) {
  const cleanToken = clean(token);
  if (!isValidPortfolioSnapshotShareToken(cleanToken)) return null;
  const share = await prisma.portfolioSnapshotShare.findFirst({
    where: { tokenHash: hashPortfolioSnapshotShareToken(cleanToken), revokedAt: null },
    include: { snapshot: true },
  });
  if (!share) return null;

  return {
    id: share.id,
    snapshotId: share.snapshotId,
    createdAt: share.createdAt,
    document: parsePortfolioSnapshotDocument(share.snapshot.snapshotJson),
  };
}
