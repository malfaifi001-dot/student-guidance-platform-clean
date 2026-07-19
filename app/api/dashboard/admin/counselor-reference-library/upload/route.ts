import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import {
  getCurrentSessionUser,
  getRequestDeviceInfo,
} from "@/lib/auth/current-user";
import { logPlatformActivity } from "@/lib/admin/activity-log";
import { createReferenceLibraryFile } from "@/lib/reference-library/reference-library-service";
import {
  createReferenceLibraryStorageKey,
  deleteReferenceLibraryFile,
  saveReferenceLibraryFile,
} from "@/lib/reference-library/reference-library-storage";
import {
  isPdfSignature,
  isZipSignature,
  validateReferenceLibraryFileMetadata,
} from "@/lib/reference-library/reference-library-validation";
import {
  parseBoolean,
  parseItemTextInput,
  parseJsonArray,
  parseReferenceLibraryStatus,
  parseSafeInteger,
  referenceLibraryErrorResponse,
} from "@/lib/reference-library/reference-library-api";
import { normalizeReferenceLibraryAudiences } from "@/lib/reference-library/reference-library-audience";
import { buildReferenceLibraryPdfWithCover } from "@/lib/reference-library/reference-library-pdf-cover";

export const runtime = "nodejs";

type PreparedUpload = {
  fileName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  originalStorageKey: string | null;
  pdfCoverApplied: boolean;
  coverWarning: string | null;
};

async function loadLogoBuffer(logoUrl: string | null | undefined) {
  if (!logoUrl) {
    return null;
  }

  try {
    const response = await fetch(logoUrl);

    if (!response.ok) {
      return null;
    }

    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

function getOptionalFile(
  formData: FormData,
  fieldName: "pdfFile" | "docxFile",
) {
  const value = formData.get(fieldName);

  if (!(value instanceof File) || value.size <= 0) {
    return null;
  }

  return value;
}

async function readAndValidateUpload(input: {
  file: File;
  expectedExtension: "pdf" | "docx";
}) {
  const metadataResult = validateReferenceLibraryFileMetadata({
    fileName: input.file.name,
    mimeType: input.file.type,
    size: input.file.size,
    expectedExtension: input.expectedExtension,
  });

  if (!metadataResult.ok) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: metadataResult.error,
        },
        {
          status:
            input.file.size > 50 * 1024 * 1024
              ? 413
              : 415,
        },
      ),
    };
  }

  const buffer = new Uint8Array(await input.file.arrayBuffer());

  if (input.expectedExtension === "pdf" && !isPdfSignature(buffer)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "محتوى ملف PDF غير صالح.",
        },
        {
          status: 415,
        },
      ),
    };
  }

  if (input.expectedExtension === "docx" && !isZipSignature(buffer)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "محتوى ملف Word غير صالح.",
        },
        {
          status: 415,
        },
      ),
    };
  }

  return {
    ok: true as const,
    buffer,
    mimeType: metadataResult.mimeType,
  };
}

export async function POST(request: Request) {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const current = await getCurrentSessionUser();

  if (!current?.user) {
    return NextResponse.json(
      {
        error: "يجب تسجيل الدخول.",
      },
      {
        status: 401,
      },
    );
  }

  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json(
      {
        error: "تعذر قراءة بيانات الرفع.",
      },
      {
        status: 400,
      },
    );
  }

  const pdfFile = getOptionalFile(formData, "pdfFile");
  const docxFile = getOptionalFile(formData, "docxFile");

  if (!pdfFile && !docxFile) {
    return NextResponse.json(
      {
        error: "ارفع نسخة PDF أو نسخة Word واحدة على الأقل.",
      },
      {
        status: 400,
      },
    );
  }

  const parentId = String(formData.get("parentId") ?? "").trim();

  if (!parentId) {
    return NextResponse.json(
      {
        error: "اختر المجلد الذي سيحفظ الملف داخله.",
      },
      {
        status: 400,
      },
    );
  }

  const defaultTitleSource = pdfFile?.name ?? docxFile?.name ?? "";
  const textResult = parseItemTextInput({
    title: formData.get("title") || defaultTitleSource,
    description: formData.get("description"),
  });

  if (!textResult.ok) {
    return textResult.response;
  }

  const status = parseReferenceLibraryStatus(
    formData.get("status") ?? "DRAFT",
  );

  if (!status || status === "ARCHIVED") {
    return NextResponse.json(
      {
        error: "حالة الملف غير صالحة.",
      },
      {
        status: 400,
      },
    );
  }

  const inheritAudience = parseBoolean(
    formData.get("inheritAudience"),
    true,
  );

  const audienceResult = await normalizeReferenceLibraryAudiences(
    parseJsonArray(formData.get("audiences")),
  );

  if (!inheritAudience && !audienceResult.ok) {
    return NextResponse.json(
      {
        error: audienceResult.error,
      },
      {
        status: 400,
      },
    );
  }

  const savedStorageKeys: string[] = [];

  try {
    let pdfUpload: PreparedUpload | null = null;
    let docxUpload: PreparedUpload | null = null;

    if (pdfFile) {
      const validation = await readAndValidateUpload({
        file: pdfFile,
        expectedExtension: "pdf",
      });

      if (!validation.ok) {
        await Promise.allSettled(
          savedStorageKeys.map((storageKey) =>
            deleteReferenceLibraryFile(storageKey),
          ),
        );
        return validation.response;
      }

      const addSchoolCover = parseBoolean(
        formData.get("addSchoolCover"),
        true,
      );
      const originalStorageKey = addSchoolCover
        ? createReferenceLibraryStorageKey("pdf")
        : null;
      const finalStorageKey = createReferenceLibraryStorageKey("pdf");
      let finalBuffer = validation.buffer;
      let coverWarning: string | null = null;

      if (addSchoolCover) {
        const parent = await prisma.referenceLibraryItem.findUnique({
          where: {
            id: parentId,
          },
          select: {
            title: true,
          },
        });

        const profile = current.user.schoolAccount?.profile;
        const logoBuffer = await loadLogoBuffer(profile?.logoUrl);

        finalBuffer = await buildReferenceLibraryPdfWithCover({
          originalPdf: validation.buffer,
          identity: {
            schoolName:
              profile?.schoolName ||
              current.user.schoolAccount?.name ||
              "هوية المدرسة غير مكتملة",
            educationDepartment: profile?.educationDepartment,
            educationOffice: profile?.educationOffice,
            city: profile?.city,
            academicYear: profile?.academicYear,
            logoBuffer,
            packageTitle: parent?.title ?? null,
            fileTitle: textResult.title,
            description: textResult.description,
            counselorName:
              current.user.officialName || current.user.name,
          },
        });

        if (!profile?.schoolName || !profile?.logoUrl) {
          coverWarning =
            "تم إنشاء الغلاف بالبيانات المتاحة، لكن هوية المدرسة غير مكتملة.";
        }
      }

      if (originalStorageKey) {
        await saveReferenceLibraryFile({
          storageKey: originalStorageKey,
          buffer: validation.buffer,
        });
        savedStorageKeys.push(originalStorageKey);
      }

      await saveReferenceLibraryFile({
        storageKey: finalStorageKey,
        buffer: finalBuffer,
      });
      savedStorageKeys.push(finalStorageKey);

      pdfUpload = {
        fileName: pdfFile.name,
        storageKey: finalStorageKey,
        mimeType: validation.mimeType,
        sizeBytes: finalBuffer.byteLength,
        originalStorageKey,
        pdfCoverApplied: Boolean(originalStorageKey),
        coverWarning,
      };
    }

    if (docxFile) {
      const validation = await readAndValidateUpload({
        file: docxFile,
        expectedExtension: "docx",
      });

      if (!validation.ok) {
        await Promise.allSettled(
          savedStorageKeys.map((storageKey) =>
            deleteReferenceLibraryFile(storageKey),
          ),
        );
        return validation.response;
      }

      const storageKey = createReferenceLibraryStorageKey("docx");

      await saveReferenceLibraryFile({
        storageKey,
        buffer: validation.buffer,
      });
      savedStorageKeys.push(storageKey);

      docxUpload = {
        fileName: docxFile.name,
        storageKey,
        mimeType: validation.mimeType,
        sizeBytes: validation.buffer.byteLength,
        originalStorageKey: null,
        pdfCoverApplied: false,
        coverWarning: null,
      };
    }

    const item = await createReferenceLibraryFile({
      title: textResult.title,
      description: textResult.description,
      parentId,
      sortOrder: parseSafeInteger(formData.get("sortOrder"), 0),
      status,
      allowDownload: parseBoolean(formData.get("allowDownload"), true),
      createdById: current.user.id,
      audiences: audienceResult.ok ? audienceResult.audiences : [],
      inheritAudience,
      pdfFileName: pdfUpload?.fileName ?? null,
      pdfStorageKey: pdfUpload?.storageKey ?? null,
      pdfMimeType: pdfUpload?.mimeType ?? null,
      pdfSizeBytes: pdfUpload?.sizeBytes ?? null,
      docxFileName: docxUpload?.fileName ?? null,
      docxStorageKey: docxUpload?.storageKey ?? null,
      docxMimeType: docxUpload?.mimeType ?? null,
      docxSizeBytes: docxUpload?.sizeBytes ?? null,
      originalStorageKey: pdfUpload?.originalStorageKey ?? null,
      pdfCoverApplied: pdfUpload?.pdfCoverApplied ?? false,
    });

    const deviceInfo = await getRequestDeviceInfo();

    await logPlatformActivity({
      actorUserId: current.user.id,
      schoolAccountId: current.user.schoolAccountId,
      category: "SYSTEM",
      action: "REFERENCE_LIBRARY_FILE_UPLOADED",
      severity: "SUCCESS",
      title: "تم رفع ملف إلى المرجع الشامل",
      details: {
        itemId: item.id,
        title: item.title,
        parentId: item.parentId,
        hasPdf: Boolean(pdfUpload),
        hasDocx: Boolean(docxUpload),
        pdfCoverApplied: item.pdfCoverApplied,
      },
      ...deviceInfo,
    });

    return NextResponse.json(
      {
        message: "تم رفع الملف بنجاح.",
        warning: pdfUpload?.coverWarning ?? null,
        item,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    await Promise.allSettled(
      savedStorageKeys.map((storageKey) =>
        deleteReferenceLibraryFile(storageKey),
      ),
    );

    return referenceLibraryErrorResponse(error);
  }
}
