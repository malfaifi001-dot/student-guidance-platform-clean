import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logEvidenceUploadedEvent } from "@/lib/admin/activity-events";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { requireActiveSubscriptionApi } from "@/lib/subscription/subscription-api-guard";

export const runtime = "nodejs";

const MAX_FILES = 6;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_SIZE = 20 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
]);

function getSafeExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/webp") return "webp";
  if (file.type === "application/pdf") return "pdf";

  return null;
}

function validateFile(file: File) {
  if (file.size <= 0) {
    return "يوجد ملف فارغ ضمن الشواهد.";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "حجم كل شاهد يجب ألا يتجاوز 5MB.";
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return "صيغة الشاهد غير مدعومة. الصيغ المسموحة: PNG أو JPG أو WEBP أو PDF.";
  }

  if (!getSafeExtension(file)) {
    return "تعذر تحديد امتداد الملف بشكل آمن.";
  }

  return null;
}

async function assertCaseAccess(caseEntryId: string, schoolAccountId: string) {
  const caseEntry = await prisma.caseEntry.findFirst({
    where: {
      id: caseEntryId,
      schoolAccountId,
    },
    select: {
      id: true,
      service: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (!caseEntry) {
    throw new Error("الحالة غير موجودة أو لا تملك صلاحية الوصول إليها.");
  }

  return caseEntry;
}

export async function POST(request: Request) {
  const authResult = await requireSchoolDashboardApiContext();

  if (authResult instanceof Response) {
    return authResult;
  }

  const subscriptionGuard = await requireActiveSubscriptionApi();
  if (subscriptionGuard) return subscriptionGuard;

  try {
    const formData = await request.formData();
    const caseEntryId = String(formData.get("caseEntryId") || "").trim() || null;
    const note = String(formData.get("note") || "").trim() || null;

    const files = formData
      .getAll("files")
      .filter((file): file is File => file instanceof File);

    if (!files.length) {
      return NextResponse.json(
        {
          success: false,
          error: "لم يتم إرفاق شواهد.",
        },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        {
          success: false,
          error: `يمكن رفع ${MAX_FILES} شواهد كحد أقصى في كل مرة.`,
        },
        { status: 400 }
      );
    }

    const totalSize = files.reduce((sum: any, file: any) => sum + file.size, 0);

    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: "إجمالي حجم الشواهد في الطلب الواحد يجب ألا يتجاوز 20MB.",
        },
        { status: 400 }
      );
    }

    for (const file of files) {
      const validationError = validateFile(file);

      if (validationError) {
        return NextResponse.json(
          {
            success: false,
            error: validationError,
          },
          { status: 400 }
        );
      }
    }

    let verifiedCase:
      | {
          id: string;
          service: {
            slug: string;
          };
        }
      | null = null;

    if (caseEntryId) {
      verifiedCase = await assertCaseAccess(
        caseEntryId,
        authResult.schoolAccountId
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "evidence");
    await mkdir(uploadDir, { recursive: true });

    const uploadedItems: Array<{
      id: string;
      fileName: string;
      fileUrl: string;
      mimeType: string;
      size: number;
      caseEntryId?: string | null;
    }> = [];

    for (const file of files) {
      const extension = getSafeExtension(file);

      if (!extension) {
        continue;
      }

      const storedName = `${authResult.schoolAccountId}-${crypto.randomUUID()}.${extension}`;
      const storedPath = path.join(uploadDir, storedName);
      const publicUrl = `/uploads/evidence/${storedName}`;

      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(storedPath, buffer);

      let evidenceId: string = crypto.randomUUID();

      if (verifiedCase) {
        const dbEvidence = await prisma.caseEvidence.create({
          data: {
            caseEntryId: verifiedCase.id,
            fileName: file.name,
            fileUrl: publicUrl,
            mimeType: file.type,
            size: file.size,
            uploadedById: authResult.user.id,
          },
          select: {
            id: true,
          },
        });

        evidenceId = dbEvidence.id;
      }

      uploadedItems.push({
        id: evidenceId,
        fileName: file.name,
        fileUrl: publicUrl,
        mimeType: file.type,
        size: file.size,
        caseEntryId: verifiedCase?.id || null,
      });
    }

    if (!uploadedItems.length) {
      return NextResponse.json(
        {
          success: false,
          error: "لم يتم رفع أي شاهد صالح.",
        },
        { status: 400 }
      );
    }

    await logEvidenceUploadedEvent({
      itemsCount: uploadedItems.length,
      totalSizeBytes: uploadedItems.reduce(
        (sum: any, item: any) => sum + (Number(item.size) || 0),
        0
      ),
      fileNames: uploadedItems.map((item: any) => item.fileName),
      source: verifiedCase
        ? "case-linked-evidence-upload"
        : "dashboard-evidence-upload",
      caseId: verifiedCase?.id || null,
    });

    return NextResponse.json({
      success: true,
      items: uploadedItems,
    });
  } catch (error) {
    console.error("EVIDENCE_UPLOAD_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء رفع الشواهد.",
      },
      { status: 400 }
    );
  }
}

