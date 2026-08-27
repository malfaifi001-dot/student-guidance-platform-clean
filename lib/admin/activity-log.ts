import { Prisma } from "@prisma/client";
import { recordAuditEvent } from "@/lib/audit/audit-service";

export type PlatformActivityCategory =
  | "AUTH"
  | "USER"
  | "SUBSCRIPTION"
  | "ACTIVATION"
  | "PAYMENT"
  | "CASE"
  | "REPORT"
  | "EVIDENCE"
  | "WORKFLOW"
  | "SECURITY"
  | "SYSTEM";

export type PlatformActivitySeverity =
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "ERROR";

type PlatformActivityInput = {
  actorUserId?: string | null;
  targetUserId?: string | null;
  schoolAccountId?: string | null;

  category: PlatformActivityCategory | string;
  action: string;
  severity?: PlatformActivitySeverity | string;

  title: string;
  details?: Prisma.InputJsonValue | Record<string, unknown>;

  ipAddress?: string | null;
  userAgent?: string | null;
};

function toPrismaJsonValue(
  value: Prisma.InputJsonValue | Record<string, unknown> | undefined
): Prisma.InputJsonValue {
  if (value === undefined) {
    return {};
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function logPlatformActivity(input: PlatformActivityInput) {
  await recordAuditEvent({
    actorUserId: input.actorUserId,
    targetUserId: input.targetUserId,
    schoolAccountId: input.schoolAccountId,
    category: input.category,
    action: input.action,
    status:
      input.severity === "ERROR"
        ? "FAILED"
        : input.severity === "SUCCESS"
          ? "SUCCESS"
          : "INFO",
    title: input.title,
    metadata: toPrismaJsonValue(input.details),
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });
}

export async function logAdminActivity(input: PlatformActivityInput) {
  return logPlatformActivity(input);
}
