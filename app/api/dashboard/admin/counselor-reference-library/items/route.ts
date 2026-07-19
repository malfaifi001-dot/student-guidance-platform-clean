import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import {
  getCurrentSessionUser,
  getRequestDeviceInfo,
} from "@/lib/auth/current-user";
import { logPlatformActivity } from "@/lib/admin/activity-log";
import {
  createReferenceLibraryFolder,
  listAdminReferenceLibraryItems,
} from "@/lib/reference-library/reference-library-service";
import {
  parseItemTextInput,
  parseReferenceLibraryStatus,
  parseSafeInteger,
  referenceLibraryErrorResponse,
} from "@/lib/reference-library/reference-library-api";
import { normalizeReferenceLibraryAudiences } from "@/lib/reference-library/reference-library-audience";

export async function GET(request: Request) {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const url = new URL(request.url);
  const parentId = url.searchParams.get("parentId")?.trim() || null;
  const search = url.searchParams.get("search")?.trim() || null;
  const statusValue = url.searchParams.get("status");
  const status = statusValue
    ? parseReferenceLibraryStatus(statusValue)
    : null;

  if (statusValue && !status) {
    return NextResponse.json(
      {
        error: "حالة العنصر غير صالحة.",
      },
      {
        status: 400,
      },
    );
  }

  const result = await listAdminReferenceLibraryItems({
    parentId,
    search,
    status,
  });

  return NextResponse.json(result);
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

  const textResult = parseItemTextInput({
    title: payload.title,
    description: payload.description,
  });

  if (!textResult.ok) {
    return textResult.response;
  }

  const status = parseReferenceLibraryStatus(
    payload.status ?? "DRAFT",
  );

  if (!status || status === "ARCHIVED") {
    return NextResponse.json(
      {
        error: "حالة المجلد غير صالحة.",
      },
      {
        status: 400,
      },
    );
  }

  const inheritAudience = Boolean(payload.inheritAudience);
  const audienceResult =
    await normalizeReferenceLibraryAudiences(payload.audiences);

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

  try {
    const folder = await createReferenceLibraryFolder({
      title: textResult.title,
      description: textResult.description,
      parentId:
        String(payload.parentId ?? "").trim() || null,
      sortOrder: parseSafeInteger(payload.sortOrder, 0),
      status,
      createdById: current.user.id,
      audiences: audienceResult.ok
        ? audienceResult.audiences
        : [],
      inheritAudience,
    });

    const deviceInfo = await getRequestDeviceInfo();

    await logPlatformActivity({
      actorUserId: current.user.id,
      schoolAccountId: current.user.schoolAccountId,
      category: "SYSTEM",
      action: "REFERENCE_LIBRARY_FOLDER_CREATED",
      severity: "SUCCESS",
      title: "تم إنشاء مجلد في المرجع الشامل",
      details: {
        itemId: folder.id,
        title: folder.title,
        parentId: folder.parentId,
        status: folder.status,
      },
      ...deviceInfo,
    });

    return NextResponse.json(
      {
        message: "تم إنشاء المجلد بنجاح.",
        item: folder,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return referenceLibraryErrorResponse(error);
  }
}