import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

const PUSH_TOKEN_KEY_ENV = "PUSH_TOKEN_ENCRYPTION_KEY";

export class PushTokenProtectionError extends Error {
  constructor() {
    super("Push token protection is not configured");
    this.name = "PushTokenProtectionError";
  }
}

function getEncryptionKey(): Buffer {
  const configured = process.env[PUSH_TOKEN_KEY_ENV];
  if (!configured) throw new PushTokenProtectionError();

  const key = /^[0-9a-fA-F]{64}$/.test(configured)
    ? Buffer.from(configured, "hex")
    : Buffer.from(configured, "base64");

  if (key.length !== 32) throw new PushTokenProtectionError();
  return key;
}

export function isPushTokenEncryptionConfigured(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

export function hashPushToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function encryptPushToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, encrypted, tag].map((value) => value.toString("base64url")).join(".");
}

export function decryptPushToken(value: string): string {
  const [ivValue, encryptedValue, tagValue] = value.split(".");
  if (!ivValue || !encryptedValue || !tagValue) throw new PushTokenProtectionError();

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export async function upsertPushDevice(input: {
  userId: string;
  token: string;
  platform: string;
  packageName: string;
}) {
  const tokenHash = hashPushToken(input.token);
  const encryptedToken = encryptPushToken(input.token);

  return prisma.pushDevice.upsert({
    where: { tokenHash },
    create: {
      userId: input.userId,
      tokenHash,
      encryptedToken,
      platform: input.platform,
      packageName: input.packageName,
      enabled: true,
      revokedAt: null,
      lastSeenAt: new Date(),
    },
    update: {
      userId: input.userId,
      encryptedToken,
      platform: input.platform,
      packageName: input.packageName,
      enabled: true,
      revokedAt: null,
      lastSeenAt: new Date(),
    },
    select: { id: true },
  });
}

export async function revokePushDevice(userId: string, deviceId: string): Promise<void> {
  await prisma.pushDevice.updateMany({
    where: { id: deviceId, userId },
    data: { enabled: false, revokedAt: new Date() },
  });
}

export async function getEnabledPushDevicesForUsers(userIds: string[]) {
  if (userIds.length === 0) return [];

  return prisma.pushDevice.findMany({
    where: {
      userId: { in: userIds },
      platform: { in: ["android", "ios"] },
      packageName: "sa.teachix.app",
      enabled: true,
      revokedAt: null,
    },
    select: { id: true, tokenHash: true, encryptedToken: true },
  });
}

export async function getMostRecentlyActiveEnabledAndroidPushDevice() {
  return prisma.pushDevice.findFirst({
    where: {
      platform: "android",
      packageName: "sa.teachix.app",
      enabled: true,
      revokedAt: null,
    },
    orderBy: [{ lastSeenAt: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      userId: true,
      tokenHash: true,
      encryptedToken: true,
      platform: true,
      packageName: true,
      lastSeenAt: true,
    },
  });
}

export async function getMostRecentlyActiveEnabledPushDevice() {
  return prisma.pushDevice.findFirst({
    where: {
      platform: { in: ["android", "ios"] },
      packageName: "sa.teachix.app",
      enabled: true,
      revokedAt: null,
    },
    orderBy: [{ lastSeenAt: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      userId: true,
      tokenHash: true,
      encryptedToken: true,
      platform: true,
      packageName: true,
      lastSeenAt: true,
    },
  });
}

export async function getEnabledPushDeviceById(deviceId: string) {
  return prisma.pushDevice.findFirst({
    where: { id: deviceId, platform: { in: ["android", "ios"] }, packageName: "sa.teachix.app", enabled: true, revokedAt: null },
    select: { id: true, userId: true, tokenHash: true, encryptedToken: true, platform: true, packageName: true, lastSeenAt: true },
  });
}

export async function getEnabledAndroidPushDeviceById(deviceId: string) {
  return prisma.pushDevice.findFirst({
    where: { id: deviceId, platform: "android", packageName: "sa.teachix.app", enabled: true, revokedAt: null },
    select: { id: true, userId: true, tokenHash: true, encryptedToken: true, platform: true, packageName: true, lastSeenAt: true },
  });
}

export async function disablePushDevicesByTokenHashes(tokenHashes: string[]): Promise<void> {
  if (tokenHashes.length === 0) return;

  await prisma.pushDevice.updateMany({
    where: { tokenHash: { in: tokenHashes } },
    data: { enabled: false, revokedAt: new Date() },
  });
}
