import { headers } from "next/headers";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { logPlatformActivity } from "@/lib/admin/activity-log";

export async function getRequestActivityMeta() {
  const headerStore = await headers();

  return {
    ipAddress:
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headerStore.get("x-real-ip") ||
      null,
    userAgent: headerStore.get("user-agent") || null,
  };
}

export async function logAuthLogoutEvent(input: {
  userId: string;
  schoolAccountId?: string | null;
  email?: string | null;
}) {
  const meta = await getRequestActivityMeta();

  await logPlatformActivity({
    actorUserId: input.userId,
    targetUserId: input.userId,
    schoolAccountId: input.schoolAccountId || null,
    category: "AUTH",
    action: "logout",
    severity: "INFO",
    title: `تم تسجيل خروج المستخدم ${input.email || ""}`.trim(),
    details: {
      email: input.email || null,
    },
    ...meta,
  });
}

export async function logActivationCodeRedeemedEvent(input: {
  userId: string;
  schoolAccountId?: string | null;
  code: string;
}) {
  const meta = await getRequestActivityMeta();

  await logPlatformActivity({
    actorUserId: input.userId,
    targetUserId: input.userId,
    schoolAccountId: input.schoolAccountId || null,
    category: "ACTIVATION",
    action: "redeem-activation-code",
    severity: "SUCCESS",
    title: "تم استخدام كود تفعيل",
    details: {
      code: input.code,
    },
    ...meta,
  });
}

export async function logBankTransferRequestedEvent(input: {
  userId: string;
  schoolAccountId?: string | null;
  amount?: number | null;
  planId?: string | null;
  billingCycle?: string | null;
}) {
  const meta = await getRequestActivityMeta();

  await logPlatformActivity({
    actorUserId: input.userId,
    targetUserId: input.userId,
    schoolAccountId: input.schoolAccountId || null,
    category: "PAYMENT",
    action: "bank-transfer-requested",
    severity: "INFO",
    title: "تم إرسال طلب تحويل بنكي",
    details: {
      amount: input.amount || null,
      planId: input.planId || null,
      billingCycle: input.billingCycle || null,
    },
    ...meta,
  });
}

export async function logPlanOrderCreatedEvent(input: {
  userId: string;
  schoolAccountId?: string | null;
  planId: string;
  planName?: string | null;
  billingCycle?: string | null;
  amount?: number | null;
}) {
  const meta = await getRequestActivityMeta();

  await logPlatformActivity({
    actorUserId: input.userId,
    targetUserId: input.userId,
    schoolAccountId: input.schoolAccountId || null,
    category: "SUBSCRIPTION",
    action: "plan-order-created",
    severity: "INFO",
    title: `تم طلب باقة ${input.planName || ""}`.trim(),
    details: {
      planId: input.planId,
      planName: input.planName || null,
      billingCycle: input.billingCycle || null,
      amount: input.amount || null,
    },
    ...meta,
  });
}

export async function logBankTransferReviewedEvent(input: {
  actorUserId: string;
  schoolAccountId?: string | null;
  requestId: string;
  status: "APPROVED" | "REJECTED";
  amount?: number | null;
  note?: string | null;
}) {
  const meta = await getRequestActivityMeta();

  await logPlatformActivity({
    actorUserId: input.actorUserId,
    schoolAccountId: input.schoolAccountId || null,
    category: "PAYMENT",
    action:
      input.status === "APPROVED"
        ? "bank-transfer-approved"
        : "bank-transfer-rejected",
    severity: input.status === "APPROVED" ? "SUCCESS" : "WARNING",
    title:
      input.status === "APPROVED"
        ? "تم قبول طلب التحويل البنكي"
        : "تم رفض طلب التحويل البنكي",
    details: {
      requestId: input.requestId,
      amount: input.amount || null,
      note: input.note || null,
    },
    ...meta,
  });
}


async function getActivityActor() {
  const current = await getCurrentSessionUser();

  return {
    userId: current?.user?.id || null,
    schoolAccountId: current?.user?.schoolAccountId || null,
    email: current?.user?.email || null,
    role: current?.user?.role || null,
  };
}


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

export async function logAuthLoginEvent(input: {
  userId: string;
  schoolAccountId?: string | null;
  email?: string | null;
}) {
  const meta = await getRequestActivityMeta();

  await logPlatformActivity({
    actorUserId: input.userId,
    targetUserId: input.userId,
    schoolAccountId: input.schoolAccountId || null,
    category: "AUTH",
    action: "login",
    severity: "SUCCESS",
    title: `تم تسجيل دخول المستخدم ${input.email || ""}`.trim(),
    details: {
      email: input.email || null,
    },
    ...meta,
  });
}
