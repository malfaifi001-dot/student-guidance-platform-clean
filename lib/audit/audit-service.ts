import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auditActionLabel, normalizeAuditAction } from "./audit-events";
import type { AuditEventInput } from "./audit-types";

const PRIVATE_KEYS = /password|token|secret|cookie|authorization|signatureurl|base64|dataurl|accesskey|refresh|code/i;
const MAX_STRING_LENGTH = 500;

function sanitizeValue(value: unknown, depth = 0): Prisma.InputJsonValue {
  if (depth > 4 || value === undefined || value === null) {
    return value === null ? (null as unknown as Prisma.InputJsonValue) : {};
  }
  if (typeof value === "string") return value.slice(0, MAX_STRING_LENGTH);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeValue(item, depth + 1));
  if (typeof value === "object") {
    const output: Record<string, Prisma.InputJsonValue> = {};
    for (const [key, item] of Object.entries(value)) {
      if (PRIVATE_KEYS.test(key)) continue;
      output[key.slice(0, 80)] = sanitizeValue(item, depth + 1);
    }
    return output;
  }
  return String(value).slice(0, MAX_STRING_LENGTH);
}

export function sanitizeAuditMetadata(metadata: AuditEventInput["metadata"]): Prisma.InputJsonValue {
  return sanitizeValue(metadata || {});
}

/**
 * Best-effort audit persistence. Business requests must not fail because an
 * audit write is unavailable; critical callers may still call this in their
 * transaction when they already have a transaction client.
 */
export async function recordAuditEvent(input: AuditEventInput) {
  try {
    const action = normalizeAuditAction(input.action);
    const actorRole = input.actorRole || (input.actorUserId
      ? (await prisma.user.findUnique({ where: { id: input.actorUserId }, select: { role: true } }))?.role
      : null);
    const metadata = sanitizeAuditMetadata({
      ...(input.metadata && typeof input.metadata === "object" ? input.metadata : {}),
      ...(actorRole ? { actorRole } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.entityType ? { entityType: input.entityType } : {}),
      ...(input.entityId ? { entityId: input.entityId } : {}),
      ...(input.route ? { route: input.route } : {}),
      ...(input.method ? { method: input.method } : {}),
    });

    await prisma.platformActivityLog.create({
      data: {
        actorUserId: input.actorUserId || null,
        targetUserId: input.targetUserId || null,
        schoolAccountId: input.schoolAccountId || null,
        category: input.category,
        severity: input.status === "FAILED" || input.status === "DENIED" ? "ERROR" : input.status === "SUCCESS" ? "SUCCESS" : "INFO",
        action,
        title: input.title || auditActionLabel(action),
        details: metadata,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent ? input.userAgent.slice(0, 300) : null,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Teachix:Audit] Failed to persist audit event", error instanceof Error ? error.message : error);
    }
  }
}
