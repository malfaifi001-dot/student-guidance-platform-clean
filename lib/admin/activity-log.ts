import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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
  try {
    await prisma.platformActivityLog.create({
      data: {
        actorUserId: input.actorUserId || null,
        targetUserId: input.targetUserId || null,
        schoolAccountId: input.schoolAccountId || null,
        category: input.category,
        action: input.action,
        severity: input.severity || "INFO",
        title: input.title,
        details: toPrismaJsonValue(input.details),
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
      },
    });
  } catch (error) {
    console.error("Failed to write platform activity log:", error);
  }
}

export async function logAdminActivity(input: PlatformActivityInput) {
  return logPlatformActivity(input);
}
