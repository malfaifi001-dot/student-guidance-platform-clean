import {
  MAX_REFERENCE_LIBRARY_FILE_BYTES,
  REFERENCE_LIBRARY_ALLOWED_EXTENSIONS,
  REFERENCE_LIBRARY_ALLOWED_MIME_TYPES,
} from "@/lib/reference-library/reference-library-constants";

export function normalizeReferenceLibraryText(
  value: unknown,
  maxLength: number,
) {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, maxLength);
}

export function normalizeReferenceLibraryTitle(value: unknown) {
  return normalizeReferenceLibraryText(value, 200);
}

export function normalizeReferenceLibraryDescription(value: unknown) {
  const normalized = normalizeReferenceLibraryText(value, 5000);
  return normalized || null;
}

export function getSafeReferenceFileExtension(fileName: string) {
  const normalized = fileName.trim().toLowerCase();
  const parts = normalized.split(".");

  if (parts.length < 2) {
    return null;
  }

  const extension = parts.at(-1) ?? null;

  if (
    !extension ||
    !REFERENCE_LIBRARY_ALLOWED_EXTENSIONS.includes(
      extension as (typeof REFERENCE_LIBRARY_ALLOWED_EXTENSIONS)[number],
    )
  ) {
    return null;
  }

  return extension;
}

export function validateReferenceLibraryFileMetadata(input: {
  fileName: string;
  mimeType: string;
  size: number;
  expectedExtension?: "pdf" | "docx";
}) {
  const extension = getSafeReferenceFileExtension(input.fileName);

  if (!extension) {
    return {
      ok: false as const,
      error: "صيغة الملف غير مدعومة. الصيغ المتاحة: PDF وDOCX.",
    };
  }

  if (input.expectedExtension && extension !== input.expectedExtension) {
    return {
      ok: false as const,
      error:
        input.expectedExtension === "pdf"
          ? "اختر ملف PDF في خانة نسخة PDF."
          : "اختر ملف Word بصيغة DOCX في خانة نسخة Word.",
    };
  }

  if (
    !REFERENCE_LIBRARY_ALLOWED_MIME_TYPES.includes(
      input.mimeType as (typeof REFERENCE_LIBRARY_ALLOWED_MIME_TYPES)[number],
    )
  ) {
    return {
      ok: false as const,
      error: "نوع الملف غير مدعوم.",
    };
  }

  const expectedMimeType =
    extension === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  if (input.mimeType !== expectedMimeType) {
    return {
      ok: false as const,
      error: "امتداد الملف لا يتوافق مع نوعه.",
    };
  }

  if (!Number.isSafeInteger(input.size) || input.size <= 0) {
    return {
      ok: false as const,
      error: "الملف فارغ أو حجمه غير صالح.",
    };
  }

  if (input.size > MAX_REFERENCE_LIBRARY_FILE_BYTES) {
    return {
      ok: false as const,
      error: "حجم الملف يتجاوز الحد الأعلى المسموح وهو 50 ميجابايت.",
    };
  }

  return {
    ok: true as const,
    extension,
    mimeType: expectedMimeType,
  };
}

export function isPdfSignature(buffer: Uint8Array) {
  return (
    buffer.length >= 5 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  );
}

export function isZipSignature(buffer: Uint8Array) {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    ((buffer[2] === 0x03 && buffer[3] === 0x04) ||
      (buffer[2] === 0x05 && buffer[3] === 0x06) ||
      (buffer[2] === 0x07 && buffer[3] === 0x08))
  );
}
