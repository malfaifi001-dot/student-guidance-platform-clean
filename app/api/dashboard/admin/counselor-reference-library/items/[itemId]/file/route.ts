import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import {
  getCurrentSessionUser,
  getRequestDeviceInfo,
} from "@/lib/auth/current-user";
import { logPlatformActivity } from "@/lib/admin/activity-log";
import { removeReferenceLibraryFileVariant } from "@/lib/reference-library/reference-library-service";
import { referenceLibraryErrorResponse } from "@/lib/reference-library/reference-library-api";
import type { ReferenceLibraryFileVariant } from "@/lib/reference-library/reference-library-types";

type RouteContext = {
  params: Promise<{
    itemId: string;
  }>;
};

function parseVariant(value: unknown) {
  const normalized = String(value ?? "").trim().toUpperCase();

  if (normalized === "PDF" || normalized === "DOCX") {
    return normalized as ReferenceLibraryFileVariant;
  }

  return null;
}

export async function DELETE(
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
  const payload = await request.json().catch(() => null);
  const variant = parseVariant(
    payload && typeof payload === "object" && "variant" in payload
      ? payload.variant
      : null,
  );

  if (!variant) {
    return NextResponse.json(
      {
        error: "حدد نوع النسخة المراد حذفها.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const item = await removeReferenceLibraryFileVariant({
      itemId,
      variant,
    });

    const deviceInfo = await getRequestDeviceInfo();

    await logPlatformActivity({
      actorUserId: current.user.id,
      schoolAccountId: current.user.schoolAccountId,
      category: "SYSTEM",
      action: "REFERENCE_LIBRARY_FILE_VARIANT_REMOVED",
      severity: "WARNING",
      title: "تم حذف نسخة ملف من مكتبة الموجه الطلابي",
      details: {
        itemId: item.id,
        title: item.title,
        variant,
      },
      ...deviceInfo,
    });

    return NextResponse.json({
      message:
        variant === "PDF"
          ? "تم حذف نسخة PDF بنجاح."
          : "تم حذف نسخة Word بنجاح.",
      item,
    });
  } catch (error) {
    return referenceLibraryErrorResponse(error);
  }
}
