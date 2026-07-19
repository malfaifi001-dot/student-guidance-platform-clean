import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import {
  getCurrentSessionUser,
  getRequestDeviceInfo,
} from "@/lib/auth/current-user";
import { logPlatformActivity } from "@/lib/admin/activity-log";
import { createReferenceLibraryStorageKey } from "@/lib/reference-library/reference-library-storage";
import { replaceReferenceLibraryFile } from "@/lib/reference-library/reference-library-service";
import {
  isPdfSignature,
  isZipSignature,
  validateReferenceLibraryFileMetadata,
} from "@/lib/reference-library/reference-library-validation";
import { referenceLibraryErrorResponse } from "@/lib/reference-library/reference-library-api";
import type { ReferenceLibraryFileVariant } from "@/lib/reference-library/reference-library-types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    itemId: string;
  }>;
};

function parseVariant(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim().toUpperCase();

  if (normalized === "PDF" || normalized === "DOCX") {
    return normalized as ReferenceLibraryFileVariant;
  }

  return null;
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
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

  const { itemId } = await context.params;
  const formData = await request.formData().catch(() => null);
  const uploadedFile = formData?.get("file");
  const variant = formData ? parseVariant(formData.get("variant")) : null;

  if (!variant) {
    return NextResponse.json(
      {
        error: "حدد نوع النسخة المراد استبدالها.",
      },
      {
        status: 400,
      },
    );
  }

  if (!(uploadedFile instanceof File) || uploadedFile.size <= 0) {
    return NextResponse.json(
      {
        error: "اختر الملف البديل.",
      },
      {
        status: 400,
      },
    );
  }

  const expectedExtension = variant === "PDF" ? "pdf" : "docx";
  const metadataResult = validateReferenceLibraryFileMetadata({
    fileName: uploadedFile.name,
    mimeType: uploadedFile.type,
    size: uploadedFile.size,
    expectedExtension,
  });

  if (!metadataResult.ok) {
    return NextResponse.json(
      {
        error: metadataResult.error,
      },
      {
        status:
          uploadedFile.size > 50 * 1024 * 1024
            ? 413
            : 415,
      },
    );
  }

  const buffer = new Uint8Array(await uploadedFile.arrayBuffer());

  if (variant === "PDF" && !isPdfSignature(buffer)) {
    return NextResponse.json(
      {
        error: "محتوى ملف PDF غير صالح.",
      },
      {
        status: 415,
      },
    );
  }

  if (variant === "DOCX" && !isZipSignature(buffer)) {
    return NextResponse.json(
      {
        error: "محتوى ملف Word غير صالح.",
      },
      {
        status: 415,
      },
    );
  }

  const storageKey = createReferenceLibraryStorageKey(expectedExtension);

  try {
    const item = await replaceReferenceLibraryFile({
      itemId,
      variant,
      storageKey,
      buffer,
      originalFileName: uploadedFile.name,
      mimeType: metadataResult.mimeType,
      fileExtension: metadataResult.extension,
    });

    const deviceInfo = await getRequestDeviceInfo();

    await logPlatformActivity({
      actorUserId: current.user.id,
      schoolAccountId: current.user.schoolAccountId,
      category: "SYSTEM",
      action: "REFERENCE_LIBRARY_FILE_REPLACED",
      severity: "SUCCESS",
      title: "تم استبدال نسخة ملف في المرجع الشامل",
      details: {
        itemId: item.id,
        title: item.title,
        variant,
        mimeType: metadataResult.mimeType,
        sizeBytes: buffer.byteLength,
      },
      ...deviceInfo,
    });

    return NextResponse.json({
      message:
        variant === "PDF"
          ? "تم استبدال نسخة PDF بنجاح."
          : "تم استبدال نسخة Word بنجاح.",
      item,
    });
  } catch (error) {
    return referenceLibraryErrorResponse(error);
  }
}
