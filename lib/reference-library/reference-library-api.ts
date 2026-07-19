import type { ReferenceLibraryItemStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  normalizeReferenceLibraryDescription,
  normalizeReferenceLibraryTitle,
} from "@/lib/reference-library/reference-library-validation";

export function parseReferenceLibraryStatus(
  value: unknown,
): ReferenceLibraryItemStatus | null {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();

  if (
    normalized === "DRAFT" ||
    normalized === "PUBLISHED" ||
    normalized === "ARCHIVED"
  ) {
    return normalized;
  }

  return null;
}

export function parseSafeInteger(
  value: unknown,
  fallback = 0,
) {
  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed)) {
    return fallback;
  }

  return parsed;
}

export function parseBoolean(
  value: unknown,
  fallback = false,
) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (normalized === "true" || normalized === "1") {
    return true;
  }

  if (normalized === "false" || normalized === "0") {
    return false;
  }

  return fallback;
}

export function parseJsonArray(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseItemTextInput(input: {
  title: unknown;
  description: unknown;
}) {
  const title = normalizeReferenceLibraryTitle(input.title);
  const description = normalizeReferenceLibraryDescription(
    input.description,
  );

  if (!title) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "عنوان العنصر مطلوب.",
        },
        {
          status: 400,
        },
      ),
    };
  }

  return {
    ok: true as const,
    title,
    description,
  };
}

export function referenceLibraryErrorResponse(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : "UNKNOWN_ERROR";

  if (message === "REFERENCE_LIBRARY_NOT_FOUND") {
    return NextResponse.json(
      {
        error: "العنصر غير موجود.",
      },
      {
        status: 404,
      },
    );
  }

  if (message === "REFERENCE_LIBRARY_FILE_NOT_FOUND") {
    return NextResponse.json(
      {
        error: "الملف غير موجود.",
      },
      {
        status: 404,
      },
    );
  }

  if (message === "REFERENCE_LIBRARY_FOLDER_NOT_EMPTY") {
    return NextResponse.json(
      {
        error: "لا يمكن حذف مجلد يحتوي على عناصر.",
      },
      {
        status: 409,
      },
    );
  }

  if (message.startsWith("REFERENCE_LIBRARY_VALIDATION:")) {
    return NextResponse.json(
      {
        error:
          message.split(":").slice(1).join(":") ||
          "بيانات العنصر غير صالحة.",
      },
      {
        status: 400,
      },
    );
  }

  console.error("Reference library API error:", error);

  return NextResponse.json(
    {
      error: "تعذر تنفيذ العملية حاليًا.",
    },
    {
      status: 500,
    },
  );
}