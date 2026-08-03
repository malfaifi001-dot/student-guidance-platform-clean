import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import {
  getCurrentSessionUser,
  getRequestDeviceInfo,
} from "@/lib/auth/current-user";
import { logPlatformActivity } from "@/lib/admin/activity-log";
import {
  deleteReferenceLibraryItem,
  updateReferenceLibraryItem,
} from "@/lib/reference-library/reference-library-service";
import {
  parseBoolean,
  parseItemTextInput,
  parseReferenceLibraryStatus,
  referenceLibraryErrorResponse,
} from "@/lib/reference-library/reference-library-api";
import { normalizeReferenceLibraryAudiences } from "@/lib/reference-library/reference-library-audience";

type RouteContext = {
  params: Promise<{
    itemId: string;
  }>;
};

export async function PATCH(
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

  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      {
        error: "بيانات الطلب غير صالحة.",
      },
      {
        status: 400,
      },
    );
  }

  const hasTextFields =
    payload.title !== undefined ||
    payload.description !== undefined;

  const textResult = hasTextFields
    ? parseItemTextInput({
        title: payload.title,
        description: payload.description,
      })
    : null;

  if (textResult && !textResult.ok) {
    return textResult.response;
  }

  const status =
    payload.status !== undefined
      ? parseReferenceLibraryStatus(payload.status)
      : undefined;

  if (payload.status !== undefined && !status) {
    return NextResponse.json(
      {
        error: "حالة العنصر غير صالحة.",
      },
      {
        status: 400,
      },
    );
  }

  const inheritAudience =
    payload.inheritAudience !== undefined
      ? parseBoolean(payload.inheritAudience, false)
      : undefined;

  const audienceResult =
    payload.audiences !== undefined
      ? await normalizeReferenceLibraryAudiences(
          payload.audiences,
        )
      : null;

  if (
    inheritAudience === false &&
    audienceResult &&
    !audienceResult.ok
  ) {
    return NextResponse.json(
      {
        error: audienceResult.error,
      },
      {
        status: 400,
      },
    );
  }

  if (
    payload.sortOrder !== undefined &&
    !Number.isSafeInteger(Number(payload.sortOrder))
  ) {
    return NextResponse.json(
      {
        error: "ترتيب العرض يجب أن يكون رقمًا صحيحًا.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const item = await updateReferenceLibraryItem({
      itemId,
      ...(textResult?.ok
        ? {
            title: textResult.title,
            description: textResult.description,
          }
        : {}),
      ...(payload.sortOrder !== undefined
        ? {
            sortOrder: Number(payload.sortOrder),
          }
        : {}),
      ...(status
        ? {
            status,
          }
        : {}),
      ...(payload.allowDownload !== undefined
        ? {
            allowDownload: parseBoolean(
              payload.allowDownload,
              true,
            ),
          }
        : {}),
      ...(inheritAudience !== undefined
        ? {
            inheritAudience,
          }
        : {}),
      ...(audienceResult?.ok
        ? {
            audiences: audienceResult.audiences,
          }
        : {}),
    });

    const deviceInfo = await getRequestDeviceInfo();

    await logPlatformActivity({
      actorUserId: current.user.id,
      schoolAccountId: current.user.schoolAccountId,
      category: "SYSTEM",
      action: "REFERENCE_LIBRARY_ITEM_UPDATED",
      severity: "SUCCESS",
      title: "تم تحديث عنصر في مكتبة الموجه الطلابي",
      details: {
        itemId: item.id,
        title: item.title,
        status: item.status,
      },
      ...deviceInfo,
    });

    return NextResponse.json({
      message: "تم تحديث العنصر بنجاح.",
      item,
    });
  } catch (error) {
    return referenceLibraryErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
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

  try {
    const deleted = await deleteReferenceLibraryItem(itemId);
    const deviceInfo = await getRequestDeviceInfo();

    await logPlatformActivity({
      actorUserId: current.user.id,
      schoolAccountId: current.user.schoolAccountId,
      category: "SYSTEM",
      action: "REFERENCE_LIBRARY_ITEM_DELETED",
      severity: "WARNING",
      title: "تم حذف عنصر من مكتبة الموجه الطلابي",
      details: {
        itemId: deleted.id,
        itemType: deleted.itemType,
      },
      ...deviceInfo,
    });

    return NextResponse.json({
      message: "تم حذف العنصر بنجاح.",
    });
  } catch (error) {
    return referenceLibraryErrorResponse(error);
  }
}
