import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { writeDurableUpload } from "@/lib/storage/durable-upload-storage";
import { processSignatureDataUrl } from "@/lib/signatures/signature-image-processor";

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

async function saveTeacherSignature(input: {
  assignmentId: string;
  dataUrl: string;
}) {
  const buffer = await processSignatureDataUrl(input.dataUrl);
  if (!buffer) return "";

  const fileName = `teacher-signature-${Date.now()}.png`;
  return writeDurableUpload("activity-assignments", input.assignmentId, fileName, new Uint8Array(buffer));
}

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;

  const assignment = await prisma.activityAssignment.findUnique({
    where: {
      token,
    },
    include: {
      workflow: {
        include: {
          steps: {
            include: {
              fields: true,
            },
          },
        },
      },
    },
  });

  if (!assignment || assignment.status === "CANCELED") {
    return NextResponse.json(
      {
        success: false,
        error: "الرابط غير صالح.",
      },
      { status: 404 },
    );
  }

  if (assignment.caseEntryId || assignment.status === "APPROVED") {
    return NextResponse.json(
      {
        success: false,
        error: "تم اعتماد هذا النشاط مسبقًا.",
      },
      { status: 409 },
    );
  }

  if (isExpired(assignment.tokenExpiresAt)) {
  const signedAt = new Date();

    await prisma.activityAssignment.update({
      where: {
        id: assignment.id,
      },
      data: {
        status: "EXPIRED",
      },
    });

    return NextResponse.json(
      {
        success: false,
        error: "انتهت صلاحية الرابط.",
      },
      { status: 410 },
    );
  }

  const body = await request.json().catch(() => null);

  const values =
    body?.values && typeof body.values === "object"
      ? (body.values as Record<string, unknown>)
      : {};

  const evidenceItems = Array.isArray(body?.evidenceItems)
    ? body.evidenceItems
    : [];

  const teacherSignatureDataUrl = String(body?.teacherSignatureDataUrl || "").trim();

  if (!teacherSignatureDataUrl) {
    return NextResponse.json(
      {
        success: false,
        error: "توقيع المعلم مطلوب قبل إرسال النشاط.",
      },
      { status: 400 },
    );
  }

  const fields = assignment.workflow.steps.flatMap((step) => step.fields);

  for (const field of fields) {
    if (
      field.isRequired &&
      field.type !== "FILE_UPLOAD" &&
      field.type !== "IMAGE_UPLOAD" &&
      isEmpty(values[field.key])
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `الحقل مطلوب: ${field.label}`,
        },
        { status: 400 },
      );
    }
  }

  const teacherSignatureUrl = await saveTeacherSignature({
    assignmentId: assignment.id,
    dataUrl: teacherSignatureDataUrl,
  });

  if (!teacherSignatureUrl) {
    return NextResponse.json(
      {
        success: false,
        error: "تعذر حفظ توقيع المعلم. أعد التوقيع ثم حاول مرة أخرى.",
      },
      { status: 400 },
    );
  }
  const signedAt = new Date();


  await prisma.activityAssignment.update({
    where: {
      id: assignment.id,
    },
    data: {
      status: "SUBMITTED",
      submittedAt: signedAt,
      submittedValues: toPrismaJson(values),
      submittedEvidenceItems: toPrismaJsonArray(evidenceItems),
      teacherSignatureUrl,
      teacherSignedName: assignment.teacherName,
      teacherSignedAt: signedAt,
      returnedReason: null,
    },
  });

  return NextResponse.json({
    success: true,
    message: "تم إرسال النشاط مع توقيع المعلم لرائد النشاط، وسيظهر في مركز الأنشطة بعد الاعتماد.",
  });
}
