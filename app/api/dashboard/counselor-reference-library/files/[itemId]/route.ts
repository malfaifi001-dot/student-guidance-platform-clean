import { NextResponse } from "next/server";
import { getRequestDeviceInfo } from "@/lib/auth/current-user";
import { logPlatformActivity } from "@/lib/admin/activity-log";
import { getVisibleReferenceLibraryItem } from "@/lib/reference-library/reference-library-public-service";
import {
  readReferenceLibraryFile,
  referenceLibraryFileExists,
} from "@/lib/reference-library/reference-library-storage";
import { requireReferenceLibraryApiViewer } from "@/lib/reference-library/reference-library-api-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    itemId: string;
  }>;
};

type FileVariant = "pdf" | "docx";

function parseVariant(value: string | null): FileVariant | null {
  const normalized = String(value ?? "pdf").trim().toLowerCase();

  if (normalized === "pdf" || normalized === "docx") {
    return normalized;
  }

  return null;
}

function safeFileName(value: string) {
  return value
    .replace(/[\r\n"]/g, "")
    .replace(/[\\/]/g, "-")
    .trim()
    .slice(0, 180);
}

function contentDisposition(
  mode: "inline" | "attachment",
  fileName: string,
) {
  const safeName = safeFileName(fileName) || "reference-file";

  return `${mode}; filename*=UTF-8''${encodeURIComponent(safeName)}`;
}

function parseRange(rangeHeader: string, totalLength: number) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());

  if (!match) {
    return null;
  }

  const start = match[1] ? Number(match[1]) : 0;
  const requestedEnd = match[2] ? Number(match[2]) : totalLength - 1;
  const end = Math.min(requestedEnd, totalLength - 1);

  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    end < start ||
    start >= totalLength
  ) {
    return null;
  }

  return {
    start,
    end,
  };
}

export async function GET(request: Request, context: RouteContext) {
  const access = await requireReferenceLibraryApiViewer();

  if (!access.ok) {
    return access.response;
  }

  const { itemId } = await context.params;
  const url = new URL(request.url);
  const variant = parseVariant(url.searchParams.get("variant"));
  const download = url.searchParams.get("download") === "1";

  if (!variant) {
    return NextResponse.json(
      {
        error: "نوع الملف المطلوب غير صالح.",
      },
      {
        status: 400,
      },
    );
  }

  if (variant === "docx" && !download) {
    return NextResponse.json(
      {
        error: "ملفات Word متاحة للتحميل فقط.",
      },
      {
        status: 400,
      },
    );
  }

  const visibleItem = await getVisibleReferenceLibraryItem({
    itemId,
    viewer: access.viewer,
  }).catch(() => null);

  if (!visibleItem || visibleItem.itemType !== "FILE") {
    return NextResponse.json(
      {
        error: "الملف غير موجود.",
      },
      {
        status: 404,
      },
    );
  }

  if (download && !visibleItem.allowDownload) {
    return NextResponse.json(
      {
        error: "تحميل هذا الملف غير مسموح.",
      },
      {
        status: 403,
      },
    );
  }

  const selected =
    variant === "pdf"
      ? {
          storageKey: visibleItem.pdfStorageKey,
          mimeType: visibleItem.pdfMimeType ?? "application/pdf",
          fileName: visibleItem.pdfFileName ?? `${visibleItem.title}.pdf`,
          sizeBytes: visibleItem.pdfSizeBytes,
        }
      : {
          storageKey: visibleItem.docxStorageKey,
          mimeType:
            visibleItem.docxMimeType ??
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          fileName: visibleItem.docxFileName ?? `${visibleItem.title}.docx`,
          sizeBytes: visibleItem.docxSizeBytes,
        };

  if (!selected.storageKey) {
    return NextResponse.json(
      {
        error:
          variant === "pdf"
            ? "لا توجد نسخة PDF متاحة."
            : "لا توجد نسخة Word متاحة.",
      },
      {
        status: 404,
      },
    );
  }

  if (!(await referenceLibraryFileExists(selected.storageKey))) {
    return NextResponse.json(
      {
        error: "تعذر العثور على الملف المخزن.",
      },
      {
        status: 404,
      },
    );
  }

  const buffer = await readReferenceLibraryFile(selected.storageKey);

  const responseHeaders = new Headers({
    "Content-Type": selected.mimeType,
    "Content-Disposition": contentDisposition(
      download ? "attachment" : "inline",
      selected.fileName,
    ),
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store, max-age=0",
  });

  if (variant === "pdf") {
    responseHeaders.set("Accept-Ranges", "bytes");
  }

  if (download) {
    const deviceInfo = await getRequestDeviceInfo();

    void logPlatformActivity({
      actorUserId: access.current.user.id,
      schoolAccountId: access.current.user.schoolAccountId,
      category: "SYSTEM",
      action: "REFERENCE_LIBRARY_FILE_DOWNLOADED",
      severity: "INFO",
      title: "تم تنزيل ملف من مكتبة الموجه الطلابي",
      details: {
        itemId: visibleItem.id,
        title: visibleItem.title,
        variant,
        mimeType: selected.mimeType,
        sizeBytes: selected.sizeBytes,
      },
      ...deviceInfo,
    });
  }

  const rangeHeader = request.headers.get("range");

  if (variant === "pdf" && rangeHeader) {
    const range = parseRange(rangeHeader, buffer.length);

    if (!range) {
      responseHeaders.set("Content-Range", `bytes */${buffer.length}`);

      return new Response(null, {
        status: 416,
        headers: responseHeaders,
      });
    }

    const chunk = buffer.subarray(range.start, range.end + 1);

    responseHeaders.set(
      "Content-Range",
      `bytes ${range.start}-${range.end}/${buffer.length}`,
    );
    responseHeaders.set("Content-Length", String(chunk.length));

    return new Response(chunk, {
      status: 206,
      headers: responseHeaders,
    });
  }

  responseHeaders.set("Content-Length", String(buffer.length));

  return new Response(buffer, {
    status: 200,
    headers: responseHeaders,
  });
}
