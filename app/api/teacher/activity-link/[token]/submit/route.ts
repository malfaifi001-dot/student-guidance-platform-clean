import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { writeDurableUpload } from "@/lib/storage/durable-upload-storage";
import { processSignatureDataUrl } from "@/lib/signatures/signature-image-processor";
import { getActivityProgramDomainBySlug } from "@/lib/activity-programs/activity-program-catalog";
import { getRuntimeWorkflowByServiceSlug } from "@/engine/runtime/runtime-resolver";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function toPrismaJsonArray(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(Array.isArray(value) ? value : [])) as Prisma.InputJsonValue;
}

function isExpired(date?: Date | null) {
  return Boolean(date && date.getTime() < Date.now());
}

function isEmpty(value: unknown) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

async function saveTeacherSignature(dataUrl: string, draftId: string) {
  const buffer = await processSignatureDataUrl(dataUrl);
  if (!buffer) return "";

  const fileName = `teacher-signature-${Date.now()}.png`;
  return writeDurableUpload("teacher-activity-submissions", draftId, fileName, new Uint8Array(buffer));
}

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;

  const link = await prisma.teacherActivityLink.findUnique({
    where: {
      token,
    },
    select: {
      id: true,
      schoolAccountId: true,
      status: true,
      tokenExpiresAt: true,
    },
  });

  if (!link || link.status === "CLOSED" || link.status === "EXPIRED") {
    return NextResponse.json(
      { success: false, error: "الرابط غير صالح." },
      { status: 404 },
    );
  }

  if (isExpired(link.tokenExpiresAt)) {
    await prisma.teacherActivityLink.update({
      where: { id: link.id },
      data: { status: "EXPIRED" },
    });

    return NextResponse.json(
      { success: false, error: "انتهت صلاحية الرابط." },
      { status: 410 },
    );
  }

  const body = await request.json().catch(() => null);

  const domainSlug = String(body?.domainSlug || "").trim();
  const draftId = String(body?.draftId || "").trim();
  const teacherName = String(body?.teacherName || "").trim();
  const teacherPhone = "";
  const teacherEmail = null;
  const teacherSignatureDataUrl = String(body?.teacherSignatureDataUrl || "").trim();

  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(draftId)) {
    return NextResponse.json(
      { success: false, error: "معرّف الجلسة غير صالح." },
      { status: 400 },
    );
  }

  const domain = getActivityProgramDomainBySlug(domainSlug);

  if (!domain) {
    return NextResponse.json(
      { success: false, error: "مجال النشاط غير صالح." },
      { status: 400 },
    );
  }

  const publishedWorkflow = await getRuntimeWorkflowByServiceSlug(domain.serviceSlug);

  if (!publishedWorkflow) {
    return NextResponse.json(
      { success: false, error: "لم يتم نشر نموذج لهذا المجال بعد." },
      { status: 404 },
    );
  }

  if (!teacherName) {
    return NextResponse.json(
      { success: false, error: "اسم المعلم مطلوب." },
      { status: 400 },
    );
  }

  if (!teacherSignatureDataUrl) {
    return NextResponse.json(
      { success: false, error: "توقيع المعلم مطلوب قبل إرسال النشاط." },
      { status: 400 },
    );
  }
  const values =
    body?.values && typeof body.values === "object"
      ? (body.values as Record<string, unknown>)
      : {};

  const evidenceItems = Array.isArray(body?.evidenceItems)
    ? body.evidenceItems
    : [];

  const fields = publishedWorkflow.workflow.steps.flatMap((step) => step.fields);

  for (const field of fields) {
    if (
      field.isRequired &&
      field.type !== "FILE_UPLOAD" &&
      field.type !== "IMAGE_UPLOAD" &&
      isEmpty(values[field.key])
    ) {
      return NextResponse.json(
        { success: false, error: `الحقل مطلوب: ${field.label}` },
        { status: 400 },
      );
    }
  }

  const teacherSignatureUrl = await saveTeacherSignature(teacherSignatureDataUrl, draftId);

  if (!teacherSignatureUrl) {
    return NextResponse.json(
      { success: false, error: "تعذر حفظ توقيع المعلم. أعد التوقيع ثم حاول مرة أخرى." },
      { status: 400 },
    );
  }

  const signedAt = new Date();

  const submission = await prisma.teacherActivitySubmission.create({
    data: {
      linkId: link.id,
      schoolAccountId: link.schoolAccountId,
      serviceId: publishedWorkflow.service.id,
      workflowId: publishedWorkflow.workflow.id,
      domainSlug: domain.slug,
      domainTitle: domain.title,
      teacherName,
      teacherPhone,
      teacherEmail,
      teacherSignatureUrl,
      teacherSignedName: teacherName,
      teacherSignedAt: signedAt,
      submittedValues: toPrismaJson(values),
      submittedEvidenceItems: toPrismaJsonArray(evidenceItems),
      status: "SUBMITTED",
      submittedAt: signedAt,
    },
  });

  return NextResponse.json({
    success: true,
    submissionId: submission.id,
    message: "تم إرسال النشاط مع توقيع المعلم، وسيظهر لرائد النشاط للمراجعة والاعتماد.",
  });
}
