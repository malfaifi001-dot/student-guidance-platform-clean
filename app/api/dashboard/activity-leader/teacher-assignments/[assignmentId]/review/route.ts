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
    assignmentId: string;
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

  const { assignmentId } = await context.params;
  const body = await request.json().catch(() => null);
  const action = String(body?.action || "").trim();

  const assignment = await prisma.activityAssignment.findFirst({
    where: {
      id: assignmentId,
      schoolAccountId: authResult.schoolAccountId,
    },
  });

  if (!assignment) {
    return NextResponse.json(
      { success: false, error: "التكليف غير موجود." },
      { status: 404 },
    );
  }

  if (action === "UPDATE_SUBMISSION") {
    if (assignment.caseEntryId || assignment.status === "APPROVED") {
      return NextResponse.json(
        { success: false, error: "لا يمكن تعديل نشاط بعد اعتماده." },
        { status: 409 },
      );
    }

    const values = asRecord(body?.values);
    const evidenceItems = Array.isArray(body?.evidenceItems)
      ? body.evidenceItems
      : assignment.submittedEvidenceItems;

    await prisma.activityAssignment.update({
      where: {
        id: assignment.id,
      },
      data: {
        submittedValues: toPrismaJson(values),
        submittedEvidenceItems: toPrismaJsonArray(evidenceItems),
        status: "SUBMITTED",
        submittedAt: assignment.submittedAt || new Date(),
        returnedReason: null,
      },
    });

    void dispatchAutomaticPushEvent({ triggerKey: "activity-assignment-returned", actorUserId: authResult.user.id, sourceRecordId: assignment.id, variables: { assignmentTitle: assignment.domainTitle } }).catch(() => undefined);

    return NextResponse.json({
      success: true,
      message: "تم تعديل بيانات النشاط بنجاح.",
    });
  }

  if (action === "RETURN") {
    if (assignment.caseEntryId || assignment.status === "APPROVED") {
      return NextResponse.json(
        { success: false, error: "لا يمكن إرجاع نشاط بعد اعتماده." },
        { status: 409 },
      );
    }

    const reason = String(body?.reason || "").trim() || null;

    await prisma.activityAssignment.update({
      where: {
        id: assignment.id,
      },
      data: {
        status: "RETURNED",
        returnedAt: new Date(),
        returnedReason: reason,
      },
    });

    void dispatchAutomaticPushEvent({ triggerKey: "activity-assignment-approved", actorUserId: authResult.user.id, sourceRecordId: assignment.id, variables: { assignmentTitle: assignment.domainTitle } }).catch(() => undefined);

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

  if (assignment.caseEntryId) {
    await prisma.activityAssignment.update({
      where: {
        id: assignment.id,
      },
      data: {
        status: "APPROVED",
        approvedAt: assignment.approvedAt || new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      caseId: assignment.caseEntryId,
      message: "النشاط معتمد مسبقًا.",
    });
  }

  if (assignment.status !== "SUBMITTED") {
    return NextResponse.json(
      { success: false, error: "لا يمكن الاعتماد قبل إرسال المعلم للنشاط." },
      { status: 400 },
    );
  }

  if (!assignment.teacherSignatureUrl) {
    return NextResponse.json(
      { success: false, error: "لا يمكن اعتماد النشاط قبل توقيع المعلم." },
      { status: 400 },
    );
  }

  const submittedValues = asRecord(assignment.submittedValues);
  const submittedEvidenceItems = asEvidenceItems(assignment.submittedEvidenceItems);

  const caseTitle = getCaseTitle(
    submittedValues,
    `${assignment.domainTitle} - ${assignment.teacherName}`,
  );

  const result = await saveRuntimeCase({
    schoolAccountId: assignment.schoolAccountId,
    createdById: assignment.createdById,
    workflowId: assignment.workflowId,
    serviceId: assignment.serviceId,
    title: caseTitle,
    studentId: null,
    values: {
      ...submittedValues,
      activity_assignment_id: assignment.id,
      assigned_teacher_name: assignment.teacherName,
      assigned_teacher_phone: assignment.teacherPhone,
      assigned_teacher_signature_url: assignment.teacherSignatureUrl,
      assigned_teacher_signed_name: assignment.teacherSignedName || assignment.teacherName,
      assigned_teacher_signed_at: assignment.teacherSignedAt?.toISOString() || "",
      activity_domain: assignment.domainTitle,
      submission_source: "TEACHER_PUBLIC_LINK_APPROVED",
    },
    evidenceItems: submittedEvidenceItems,
    status: "SUBMITTED",
  });

  await prisma.activityAssignment.update({
    where: {
      id: assignment.id,
    },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      caseEntryId: result.id,
    },
  });

  void dispatchAutomaticPushEvent({ triggerKey: "activity-assignment-approved", actorUserId: authResult.user.id, sourceRecordId: assignment.id, variables: { assignmentTitle: assignment.domainTitle } }).catch(() => undefined);

  return NextResponse.json({
    success: true,
    caseId: result.id,
    message: "تم اعتماد النشاط وإنشاء الحالة بنجاح.",
  });
}
