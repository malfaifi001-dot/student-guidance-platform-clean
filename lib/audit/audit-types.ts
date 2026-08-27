import type { Prisma } from "@prisma/client";
import type { AuditAction } from "./audit-events";

export type AuditCategory =
  | "AUTH"
  | "USER"
  | "SUBSCRIPTION"
  | "ACTIVATION"
  | "PAYMENT"
  | "CASE"
  | "REPORT"
  | "EVIDENCE"
  | "WORKFLOW"
  | "SIGNATURE"
  | "SETTINGS"
  | "SURVEY"
  | "CERTIFICATE"
  | "FILE"
  | "LINKING"
  | "ADMIN"
  | "PRINT_EXPORT"
  | "SECURITY"
  | "SYSTEM"
  | string;

export type AuditStatus = "SUCCESS" | "FAILED" | "DENIED" | "INFO";

export type AuditEventInput = {
  actorUserId?: string | null;
  targetUserId?: string | null;
  schoolAccountId?: string | null;
  actorRole?: string | null;
  action: AuditAction | string;
  category: AuditCategory;
  status?: AuditStatus;
  title?: string | null;
  message?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  route?: string | null;
  method?: string | null;
  metadata?: Prisma.InputJsonValue | Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};
