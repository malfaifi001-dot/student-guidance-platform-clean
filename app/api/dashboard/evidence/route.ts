import crypto from "crypto";
import { NextResponse } from "next/server";
import { requireActiveSubscriptionForCurrentUser } from "@/bin/require-auth";
import { logEvidenceUploadedEvent } from "@/lib/admin/activity-events";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { buildCaseEntryWhereForUser } from "@/lib/cases/case-access-scope";
import {
  saveEvidenceFiles,
  validateEvidenceFiles,
} from "@/lib/evidence/save-evidence-files";
import {
  EVIDENCE_UPLOAD_TOO_LARGE_MESSAGE,
  MAX_EVIDENCE_FILES,
  MAX_EVIDENCE_FILES_MESSAGE,
  MAX_EVIDENCE_TOTAL_SIZE,
} from "@/lib/evidence/evidence-limits";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function assertCaseAccess(
  caseEntryId: string,
  user: {
    id: string;
    role: string;
    email: string;
    schoolAccountId: string;
  },
) {
  const caseEntry = await prisma.caseEntry.findFirst({
    where: {
      ...buildCaseEntryWhereForUser(user),
      id: caseEntryId,
    },
    select: {
      id: true,
      service: {
        select: {
          slug: true,
        },
      },
      _count: {
        select: {
          caseEvidences: true,
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
  const authResult = await requireSchoolDashboardApiContext({
    allowPrincipal: true,
  });

  if (authResult instanceof Response) {
    return authResult;
  }

  const subscriptionGuard = await requireActiveSubscriptionForCurrentUser({
    allowPrincipal: true,
  });
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
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      if (totalSize > MAX_EVIDENCE_TOTAL_SIZE) {
        return NextResponse.json(
          {
            ok: false,
            success: false,
            code: "EVIDENCE_UPLOAD_TOO_LARGE",
            message: EVIDENCE_UPLOAD_TOO_LARGE_MESSAGE,
          },
          { status: 413 },
        );
      }

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
          _count: {
            caseEvidences: number;
          };
        }
      | null = null;

    if (caseEntryId) {
      verifiedCase = await assertCaseAccess(
        caseEntryId,
        {
          id: authResult.user.id,
          role: authResult.user.role,
          email: authResult.user.email,
          schoolAccountId: authResult.schoolAccountId,
        },
      );

      if (
        verifiedCase._count.caseEvidences + files.length >
        MAX_EVIDENCE_FILES
      ) {
        return NextResponse.json(
          { success: false, error: MAX_EVIDENCE_FILES_MESSAGE },
          { status: 400 },
        );
      }
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

    const errorMessage = error instanceof Error ? error.message : "";
    if (
      /request body exceeded|failed to parse body as formdata|body size|too large/i.test(
        errorMessage,
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          code: "EVIDENCE_UPLOAD_TOO_LARGE",
          message: EVIDENCE_UPLOAD_TOO_LARGE_MESSAGE,
        },
        { status: 413 },
      );
    }

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
