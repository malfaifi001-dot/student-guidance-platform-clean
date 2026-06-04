import { prisma } from "@/lib/prisma";

type NoorImportAuditPayload = {
  schoolAccountId: string;
  userId?: string | null;
  event: string;
  title: string;
  description?: string;
  severity?: "INFO" | "WARNING" | "ERROR";
  metadata?: Record<string, unknown>;
};

export async function writeNoorImportActivity(payload: NoorImportAuditPayload) {
  const db = prisma as any;

  try {
    if (!db.platformActivityLog?.create) {
      return;
    }

    await db.platformActivityLog.create({
      data: {
        schoolAccountId: payload.schoolAccountId,
        userId: payload.userId ?? null,
        type: payload.event,
        event: payload.event,
        action: payload.event,
        title: payload.title,
        description: payload.description ?? payload.title,
        severity: payload.severity ?? "INFO",
        metadata: payload.metadata ?? {},
      },
    });
  } catch {
    // لا نكسر استيراد نور بسبب اختلاف شكل ActivityLog الحالي.
  }
}