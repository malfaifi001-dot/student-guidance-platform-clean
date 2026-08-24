import "server-only";

import crypto, { createCipheriv, createDecipheriv } from "node:crypto";
import { prisma } from "@/lib/prisma";

function clean(value: unknown) {
  return String(value || "").trim();
}

function encryptionKey() {
  const configured = process.env.ACTIVITY_PLAN_SHARE_TOKEN_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (process.env.NODE_ENV === "production" && (!configured || configured.trim().length < 32)) {
    throw new Error("ACTIVITY_PLAN_SHARE_TOKEN_ENCRYPTION_KEY or NEXTAUTH_SECRET is required in production.");
  }

  return crypto.createHash("sha256").update(
    String(configured || "development-only-activity-plan-share-key"),
    "utf8",
  ).digest();
}

function encryptToken(token: string) {
  const iv = crypto.randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, encrypted, cipher.getAuthTag()].map((part) => part.toString("base64url")).join(".");
}

function decryptToken(value: string) {
  const [ivValue, encryptedValue, tagValue] = value.split(".");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
}

export function hashActivityPlanShareToken(token: string) {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export function createActivityPlanShareToken() {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, tokenHash: hashActivityPlanShareToken(token) };
}

export function resolveActivityPlanPublicOrigin() {
  const configured = clean(
    process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.SITE_URL,
  ).replace(/\/+$/, "");
  return /^https?:\/\//i.test(configured) ? configured : "http://localhost:3000";
}

export function buildActivityPlanPublicUrl(token: string) {
  return `${resolveActivityPlanPublicOrigin()}/activity-plan/${encodeURIComponent(token)}`;
}

export async function getOrCreateActivityPlanShareToken(input: {
  schoolAccountId: string;
  createdById: string;
}) {
  const current = await prisma.activityPlanShareToken.findFirst({
    where: {
      schoolAccountId: input.schoolAccountId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, encryptedToken: true },
  });

  if (current) {
    try { return { url: buildActivityPlanPublicUrl(decryptToken(current.encryptedToken)), tokenId: current.id }; }
    catch { await prisma.activityPlanShareToken.update({ where: { id: current.id }, data: { revokedAt: new Date() } }); }
  }

  const { token, tokenHash } = createActivityPlanShareToken();
  const created = await prisma.activityPlanShareToken.create({
    data: { tokenHash, encryptedToken: encryptToken(token), schoolAccountId: input.schoolAccountId, createdById: input.createdById },
    select: { id: true },
  });
  return { url: buildActivityPlanPublicUrl(token), tokenId: created.id };
}

export async function revokeActivityPlanShareTokens(input: { schoolAccountId: string }) {
  return prisma.activityPlanShareToken.updateMany({
    where: { schoolAccountId: input.schoolAccountId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getPublicActivityPlanShare(token: string) {
  const cleanToken = clean(token);
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(cleanToken)) return null;
  const share = await prisma.activityPlanShareToken.findUnique({
    where: { tokenHash: hashActivityPlanShareToken(cleanToken) },
    select: { schoolAccountId: true, revokedAt: true, expiresAt: true },
  });
  if (!share || share.revokedAt || (share.expiresAt && share.expiresAt <= new Date())) return null;
  return { schoolAccountId: share.schoolAccountId };
}
