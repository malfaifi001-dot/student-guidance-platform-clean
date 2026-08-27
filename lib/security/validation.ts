import "server-only";
import { recordAuditEvent } from "@/lib/audit/audit-service";

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "VIEW_CASE"
  | "CREATE_CASE"
  | "UPDATE_CASE"
  | "CLOSE_CASE"
  | "UPLOAD_EVIDENCE"
  | "EXPORT_REPORT"
  | "UPLOAD_WORKFLOW";

type AuditInput = {
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function auditLog(input: AuditInput) {
  await recordAuditEvent({
    actorUserId: input.userId,
    targetUserId: input.userId,
    action: input.action,
    category: input.action.includes("SIGN") ? "SIGNATURE" : "SECURITY",
    status: "SUCCESS",
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
  });
  return;
  /*
  // مؤقتًا للتطوير.
  // لاحقًا يربط بجدول AuditLog في Prisma.
  console.info("[AUDIT]", {
    ...input,
    at: new Date().toISOString(),
  });*/
}
