const fs = require("fs");

const path = "lib/admin/activity-events.ts";
let content = fs.readFileSync(path, "utf8");

if (!content.includes('getCurrentSessionUser')) {
  content = content.replace(
    'import { headers } from "next/headers";',
    'import { headers } from "next/headers";\nimport { getCurrentSessionUser } from "@/lib/auth/current-user";'
  );
}

if (!content.includes("async function getActivityActor")) {
  content += `

async function getActivityActor() {
  const current = await getCurrentSessionUser();

  return {
    userId: current?.user?.id || null,
    schoolAccountId: current?.user?.schoolAccountId || null,
    email: current?.user?.email || null,
    role: current?.user?.role || null,
  };
}
`;
}

if (!content.includes("logCaseSavedEvent")) {
  content += `

export async function logCaseSavedEvent(input: {
  caseId: string;
  status: "DRAFT" | "SUBMITTED";
  title?: string | null;
  workflowId?: string | null;
  serviceId?: string | null;
  serviceSlug?: string | null;
  studentId?: string | null;
  valueCount?: number;
  evidenceCount?: number;
}) {
  const [meta, actor] = await Promise.all([
    getRequestActivityMeta(),
    getActivityActor(),
  ]);

  await logPlatformActivity({
    actorUserId: actor.userId,
    targetUserId: actor.userId,
    schoolAccountId: actor.schoolAccountId,
    category: "CASE",
    action: input.status === "SUBMITTED" ? "case-submitted" : "case-draft-saved",
    severity: input.status === "SUBMITTED" ? "SUCCESS" : "INFO",
    title:
      input.status === "SUBMITTED"
        ? "تم إرسال حالة إرشادية"
        : "تم حفظ مسودة حالة إرشادية",
    details: {
      caseId: input.caseId,
      caseTitle: input.title || null,
      status: input.status,
      workflowId: input.workflowId || null,
      serviceId: input.serviceId || null,
      serviceSlug: input.serviceSlug || null,
      studentId: input.studentId || null,
      valueCount: input.valueCount || 0,
      evidenceCount: input.evidenceCount || 0,
    },
    ...meta,
  });
}

export async function logEvidenceUploadedEvent(input: {
  itemsCount: number;
  totalSizeBytes: number;
  fileNames?: string[];
  source?: string;
  caseId?: string | null;
  reportId?: string | null;
}) {
  const [meta, actor] = await Promise.all([
    getRequestActivityMeta(),
    getActivityActor(),
  ]);

  await logPlatformActivity({
    actorUserId: actor.userId,
    targetUserId: actor.userId,
    schoolAccountId: actor.schoolAccountId,
    category: "EVIDENCE",
    action: "evidence-uploaded",
    severity: "SUCCESS",
    title: "تم رفع شواهد",
    details: {
      itemsCount: input.itemsCount,
      totalSizeBytes: input.totalSizeBytes,
      fileNames: input.fileNames || [],
      source: input.source || "general-evidence-upload",
      caseId: input.caseId || null,
      reportId: input.reportId || null,
    },
    ...meta,
  });
}

export async function logReportCreatedEvent(input: {
  reportId: string;
  caseEntryId?: string | null;
  title?: string | null;
  templateId?: string | null;
  serviceSlug?: string | null;
  evidenceCount?: number;
}) {
  const [meta, actor] = await Promise.all([
    getRequestActivityMeta(),
    getActivityActor(),
  ]);

  await logPlatformActivity({
    actorUserId: actor.userId,
    targetUserId: actor.userId,
    schoolAccountId: actor.schoolAccountId,
    category: "REPORT",
    action: "report-created",
    severity: "SUCCESS",
    title: "تم إنشاء تقرير إرشادي",
    details: {
      reportId: input.reportId,
      caseEntryId: input.caseEntryId || null,
      reportTitle: input.title || null,
      templateId: input.templateId || null,
      serviceSlug: input.serviceSlug || null,
      evidenceCount: input.evidenceCount || 0,
    },
    ...meta,
  });
}

export async function logReportExportedEvent(input: {
  reportId: string;
  format?: "PDF" | "WORD" | "HTML" | "UNKNOWN";
  title?: string | null;
}) {
  const [meta, actor] = await Promise.all([
    getRequestActivityMeta(),
    getActivityActor(),
  ]);

  await logPlatformActivity({
    actorUserId: actor.userId,
    targetUserId: actor.userId,
    schoolAccountId: actor.schoolAccountId,
    category: "REPORT",
    action: "report-exported",
    severity: "SUCCESS",
    title: "تم تصدير تقرير",
    details: {
      reportId: input.reportId,
      format: input.format || "UNKNOWN",
      reportTitle: input.title || null,
    },
    ...meta,
  });
}
`;
}

fs.writeFileSync(path, content, "utf8");
console.log("تمت إضافة أحداث الحالات والتقارير والشواهد.");
