import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { saveRuntimeCase } from "@/engine/cases/case-runtime-engine";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { prisma } from "@/lib/prisma";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { dispatchAutomaticPushEvent } from "@/lib/notifications/push-center-service";

type RouteContext = {
  params: Promise<{
    submissionId: string;
  }>;
};

type RuntimeCaseEvidenceItems = NonNullable<
  Parameters<typeof saveRuntimeCase>[0]["evidenceItems"]
>;

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function toPrismaJsonArray(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(Array.isArray(value) ? value : [])) as Prisma.InputJsonValue;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asEvidenceItems(value: unknown): RuntimeCaseEvidenceItems {
  if (!Array.isArray(value)) {
    return [] as RuntimeCaseEvidenceItems;
  }

  const items = value
    .filter((item): item is Record<string, unknown> => {
      return Boolean(item && typeof item === "object" && !Array.isArray(item));
    })
    .map((item) => ({
      id: String(item.id || randomUUID()),
      fileName: String(item.fileName || "شاهد"),
      fileUrl: String(item.fileUrl || ""),
      mimeType: String(item.mimeType || "application/octet-stream"),
      size: Number(item.size || 0),
    }))
    .filter((item) => item.fileUrl);

  return items as RuntimeCaseEvidenceItems;
}

function cleanTitle(value: unknown) {
  const text = String(value || "").trim();

  if (!text || text === "undefined" || text === "null" || text.length > 140) {
    return "";
  }

  return text;
}

function getCaseTitle(values: Record<string, unknown>, fallback: string) {
  const preferredKeys = [
    "program_name",
    "activity_program",
    "activity_name",
    "program",
    "title",
    "اسم البرنامج",
    "اسم النشاط",
  ];

  for (const key of preferredKeys) {
    const candidate = cleanTitle(values[key]);
    if (candidate) return candidate;
  }

  for (const value of Object.values(values)) {
    const candidate = cleanTitle(value);
    if (candidate) return candidate;
  }

  return fallback;
}

export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireSchoolDashboardApiContext();

  if (authResult instanceof Response) {
    return authResult;
  }

  if (authResult.user.role !== "ACTIVITY_LEADER" && authResult.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "هذه العملية مخصصة لرائد النشاط." },
      { status: 403 },
    );
  }

  const guard = await requireServiceAccessApi("activity-programs");
  if (guard) return guard;

  const { submissionId } = await context.params;
  const body = await request.json().catch(() => null);
  const action = String(body?.action || "").trim();

  const submission = await prisma.teacherActivitySubmission.findFirst({
    where: {
      id: submissionId,
      schoolAccountId: authResult.schoolAccountId,
    },
    include: {
      link: {
        select: {
          id: true,
          title: true,
          createdById: true,
        },
      },
    },
  });

  if (!submission) {
    return NextResponse.json(
      { success: false, error: "النشاط غير موجود." },
      { status: 404 },
    );
  }

  const pushVariables = {
    assignmentTitle: submission.domainTitle,
    teacherName: submission.teacherName,
  };

  if (action === "CANCEL") {
    if (submission.caseEntryId || submission.status === "APPROVED") {
      return NextResponse.json(
        { success: false, error: "لا يمكن إلغاء نشاط بعد اعتماده." },
        { status: 409 },
      );
    }

    await prisma.teacherActivitySubmission.update({
      where: { id: submission.id },
      data: {
        status: "CANCELED",
        returnedReason: null,
      },
    });

    void dispatchAutomaticPushEvent({ triggerKey: "activity-teacher-link-submission-canceled", actorUserId: authResult.user.id, sourceRecordId: submission.id, variables: pushVariables }).catch(() => undefined);

    return NextResponse.json({
      success: true,
      message: "تم إلغاء النشاط.",
    });
  }

  if (action === "UPDATE_SUBMISSION") {
    if (submission.caseEntryId || submission.status === "APPROVED") {
      return NextResponse.json(
        { success: false, error: "لا يمكن تعديل نشاط بعد اعتماده." },
        { status: 409 },
      );
    }

    if (submission.status === "CANCELED") {
      return NextResponse.json(
        { success: false, error: "لا يمكن تعديل نشاط ملغي." },
        { status: 409 },
      );
    }

    const values = asRecord(body?.values);
    const evidenceItems = Array.isArray(body?.evidenceItems)
      ? body.evidenceItems
      : submission.submittedEvidenceItems;

    await prisma.teacherActivitySubmission.update({
      where: { id: submission.id },
      data: {
        submittedValues: toPrismaJson(values),
        submittedEvidenceItems: toPrismaJsonArray(evidenceItems),
        status: "SUBMITTED",
        submittedAt: submission.submittedAt || new Date(),
        returnedReason: null,
      },
    });

    void dispatchAutomaticPushEvent({ triggerKey: "activity-teacher-link-submission-updated", actorUserId: authResult.user.id, sourceRecordId: submission.id, variables: pushVariables }).catch(() => undefined);

    return NextResponse.json({
      success: true,
      message: "تم تعديل بيانات النشاط بنجاح.",
    });
  }

  if (action === "RETURN") {
    if (submission.caseEntryId || submission.status === "APPROVED") {
      return NextResponse.json(
        { success: false, error: "لا يمكن إرجاع نشاط بعد اعتماده." },
        { status: 409 },
      );
    }

    if (submission.status === "CANCELED") {
      return NextResponse.json(
        { success: false, error: "لا يمكن إرجاع نشاط ملغي." },
        { status: 409 },
      );
    }

    const reason = String(body?.reason || "").trim() || null;

    await prisma.teacherActivitySubmission.update({
      where: { id: submission.id },
      data: {
        status: "RETURNED",
        returnedAt: new Date(),
        returnedReason: reason,
      },
    });

    void dispatchAutomaticPushEvent({ triggerKey: "activity-teacher-link-submission-returned", actorUserId: authResult.user.id, sourceRecordId: submission.id, variables: pushVariables }).catch(() => undefined);

    return NextResponse.json({
      success: true,
      message: "تم إرجاع النشاط للمعلم للتعديل.",
    });
  }

  if (action !== "APPROVE") {
    return NextResponse.json(
      { success: false, error: "الإجراء غير صحيح." },
      { status: 400 },
    );
  }

  if (submission.caseEntryId) {
    await prisma.teacherActivitySubmission.update({
      where: { id: submission.id },
      data: {
        status: "APPROVED",
        approvedAt: submission.approvedAt || new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      caseId: submission.caseEntryId,
      message: "النشاط معتمد مسبقًا.",
    });
  }

  if (submission.status === "CANCELED") {
    return NextResponse.json(
      { success: false, error: "لا يمكن اعتماد نشاط ملغي." },
      { status: 400 },
    );
  }

  if (submission.status !== "SUBMITTED") {
    return NextResponse.json(
      { success: false, error: "لا يمكن الاعتماد قبل إرسال المعلم للنشاط." },
      { status: 400 },
    );
  }

  if (!submission.teacherSignatureUrl) {
    return NextResponse.json(
      { success: false, error: "لا يمكن اعتماد النشاط قبل توقيع المعلم." },
      { status: 400 },
    );
  }

  const submittedValues = asRecord(submission.submittedValues);
  const submittedEvidenceItems = asEvidenceItems(submission.submittedEvidenceItems);

  const caseTitle = getCaseTitle(
    submittedValues,
    `${submission.domainTitle} - ${submission.teacherName}`,
  );

  const result = await saveRuntimeCase({
    schoolAccountId: submission.schoolAccountId,
    createdById: submission.link.createdById,
    workflowId: submission.workflowId,
    serviceId: submission.serviceId,
    title: caseTitle,
    studentId: null,
    values: {
      ...submittedValues,
      activity_assignment_id: submission.linkId,
      assigned_teacher_name: submission.teacherName,
      assigned_teacher_phone: submission.teacherPhone,
      assigned_teacher_signature_url: submission.teacherSignatureUrl,
      assigned_teacher_signed_name: submission.teacherSignedName || submission.teacherName,
      assigned_teacher_signed_at: submission.teacherSignedAt?.toISOString() || "",
      activity_domain: submission.domainTitle,
      submission_source: "TEACHER_PUBLIC_LINK_APPROVED",
    },
    evidenceItems: submittedEvidenceItems,
    status: "SUBMITTED",
  });

  await prisma.teacherActivitySubmission.update({
    where: { id: submission.id },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      caseEntryId: result.id,
    },
  });

  void dispatchAutomaticPushEvent({ triggerKey: "activity-teacher-link-submission-approved", actorUserId: authResult.user.id, sourceRecordId: submission.id, variables: pushVariables }).catch(() => undefined);

  return NextResponse.json({
    success: true,
    caseId: result.id,
    message: "تم اعتماد النشاط وإنشاء الحالة بنجاح.",
  });
}
