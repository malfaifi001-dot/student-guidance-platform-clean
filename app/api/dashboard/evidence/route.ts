import crypto from "crypto";
import { NextResponse } from "next/server";
import { requireActiveSubscriptionForCurrentUser } from "@/bin/require-auth";
import { logEvidenceUploadedEvent } from "@/lib/admin/activity-events";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import {
  saveEvidenceFiles,
  validateEvidenceFiles,
} from "@/lib/evidence/save-evidence-files";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

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

  const subscriptionGuard = await requireActiveSubscriptionForCurrentUser();
  if (subscriptionGuard instanceof Response) {
    return subscriptionGuard;
  }

  try {
    const formData = await request.formData();
    const caseEntryId = String(formData.get("caseEntryId") || "").trim() || null;

    const files = formData
      .getAll("files")
      .filter((file): file is File => file instanceof File);

    const validationError = validateEvidenceFiles(files);

    if (validationError) {
      return NextResponse.json(
        {
          success: false,
          error: validationError,
        },
        { status: 400 },
      );
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
        authResult.schoolAccountId,
      );
    }

    const savedFiles = await saveEvidenceFiles({
      files,
      schoolAccountId: authResult.schoolAccountId,
    });

    const uploadedItems: Array<{
      id: string;
      fileName: string;
      fileUrl: string;
      mimeType: string;
      size: number;
      caseEntryId?: string | null;
    }> = [];

    for (const savedFile of savedFiles) {
      let evidenceId: string = crypto.randomUUID();

      if (verifiedCase) {
        const dbEvidence = await prisma.caseEvidence.create({
          data: {
            caseEntryId: verifiedCase.id,
            fileName: savedFile.fileName,
            fileUrl: savedFile.fileUrl,
            mimeType: savedFile.mimeType,
            size: savedFile.size,
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
        fileName: savedFile.fileName,
        fileUrl: savedFile.fileUrl,
        mimeType: savedFile.mimeType,
        size: savedFile.size,
        caseEntryId: verifiedCase?.id || null,
      });
    }

    if (!uploadedItems.length) {
      return NextResponse.json(
        {
          success: false,
          error: "لم يتم رفع أي شاهد صالح.",
        },
        { status: 400 },
      );
    }

    await logEvidenceUploadedEvent({
      itemsCount: uploadedItems.length,
      totalSizeBytes: uploadedItems.reduce(
        (sum, item) => sum + (Number(item.size) || 0),
        0,
      ),
      fileNames: uploadedItems.map((item) => item.fileName),
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
          error instanceof Error ? error.message : "حدث خطأ أثناء رفع الشواهد.",
      },
      { status: 400 },
    );
  }
}
