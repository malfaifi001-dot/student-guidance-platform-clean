import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { parseGuidanceVideoTargetRoles } from "@/lib/guidance-videos/guidance-video-config";
import {
  getOptionalGuidanceVideoFile,
  parseGuidanceVideoMetadata,
  parseGuidanceVideoSource,
  sanitizeOriginalVideoFileName,
} from "@/lib/guidance-videos/guidance-video-input";
import { guidanceVideoToDto } from "@/lib/guidance-videos/guidance-video-service";
import {
  createGuidanceMediaStorageKey,
  deleteGuidanceVideoFile,
  GUIDANCE_IMAGE_MAX_BYTES,
  GUIDANCE_VIDEO_MAX_BYTES,
  hasGuidanceMediaSignature,
  saveGuidanceVideoFile,
  validateGuidanceMediaFileMetadata,
} from "@/lib/guidance-videos/guidance-video-storage";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ videoId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;

  const { videoId } = await context.params;
  const existing = await prisma.guidanceVideo.findUnique({
    where: { id: videoId },
  });
  if (!existing) {
    return NextResponse.json({ error: "المحتوى غير موجود." }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json(
      { error: "تعذر قراءة بيانات المحتوى." },
      { status: 400 },
    );
  }

  const metadata = parseGuidanceVideoMetadata(formData, {
    title: existing.title,
    description: existing.description,
    targetRoles: parseGuidanceVideoTargetRoles(existing.targetRoles),
    isPublished: existing.isPublished,
    sortOrder: existing.sortOrder,
  });
  if (!metadata.ok) {
    return NextResponse.json({ error: metadata.error }, { status: 400 });
  }

  const source = parseGuidanceVideoSource(formData, {
    sourceType: existing.sourceType,
    youtubeVideoId: existing.youtubeVideoId,
    mediaType:
      existing.sourceType === "UPLOAD" &&
      existing.mimeType?.startsWith("image/")
        ? "IMAGE"
        : "VIDEO",
  });
  if (!source.ok) {
    return NextResponse.json({ error: source.error }, { status: 400 });
  }

  const replacement = getOptionalGuidanceVideoFile(formData);
  let nextStorageKey = existing.storageKey;
  let nextOriginalName = existing.originalFileName;
  let nextMimeType = existing.mimeType;
  let nextSizeBytes = existing.sizeBytes;
  let replacementSaved = false;
  const existingMediaType =
    existing.sourceType === "UPLOAD" && existing.mimeType?.startsWith("image/")
      ? "IMAGE"
      : "VIDEO";

  try {
    if (
      source.data.sourceType === "UPLOAD" &&
      (existing.sourceType !== "UPLOAD" ||
        existingMediaType !== source.data.mediaType) &&
      !replacement
    ) {
      return NextResponse.json(
        {
          error: `اختر ملف ${source.data.mediaType === "IMAGE" ? "الصورة" : "الفيديو"} المراد رفعه.`,
        },
        { status: 400 },
      );
    }

    if (source.data.sourceType === "UPLOAD" && replacement) {
      const validation = validateGuidanceMediaFileMetadata(
        replacement,
        source.data.mediaType,
      );
      if (!validation.ok) {
        return NextResponse.json(
          { error: validation.error },
          {
            status:
              replacement.size >
              (source.data.mediaType === "IMAGE"
                ? GUIDANCE_IMAGE_MAX_BYTES
                : GUIDANCE_VIDEO_MAX_BYTES)
                ? 413
                : 415,
          },
        );
      }

      const buffer = new Uint8Array(await replacement.arrayBuffer());
      if (!hasGuidanceMediaSignature(buffer, validation.mimeType)) {
        return NextResponse.json(
          { error: "محتوى الملف لا يطابق صيغته المعلنة." },
          { status: 415 },
        );
      }

      nextStorageKey = createGuidanceMediaStorageKey(
        source.data.mediaType,
        validation.mimeType,
      );
      nextOriginalName = sanitizeOriginalVideoFileName(replacement.name);
      nextMimeType = validation.mimeType;
      nextSizeBytes = buffer.byteLength;
      await saveGuidanceVideoFile(nextStorageKey, buffer);
      replacementSaved = true;
    }

    if (source.data.sourceType === "YOUTUBE") {
      nextStorageKey = null;
      nextOriginalName = null;
      nextMimeType = null;
      nextSizeBytes = null;
    }

    const video = await prisma.guidanceVideo.update({
      where: { id: videoId },
      data: {
        ...metadata.data,
        sourceType: source.data.sourceType,
        youtubeVideoId: source.data.youtubeVideoId,
        storageKey: nextStorageKey,
        originalFileName: nextOriginalName,
        mimeType: nextMimeType,
        sizeBytes: nextSizeBytes,
      },
    });

    if (
      existing.storageKey &&
      (replacementSaved || source.data.sourceType === "YOUTUBE")
    ) {
      await deleteGuidanceVideoFile(existing.storageKey).catch(() => undefined);
    }

    return NextResponse.json({
      message: `تم تحديث ${source.data.mediaType === "IMAGE" ? "الصورة" : "الفيديو"} بنجاح.`,
      video: guidanceVideoToDto(video),
    });
  } catch (error) {
    if (replacementSaved) {
      if (nextStorageKey) {
        await deleteGuidanceVideoFile(nextStorageKey).catch(() => undefined);
      }
    }
    console.error(
      "GUIDANCE_VIDEO_UPDATE_ERROR",
      error instanceof Error ? error.message : "UNKNOWN",
    );
    return NextResponse.json(
      { error: "تعذر تحديث المحتوى الإرشادي." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;

  const { videoId } = await context.params;
  const existing = await prisma.guidanceVideo.findUnique({
    where: { id: videoId },
  });
  if (!existing) {
    return NextResponse.json({ error: "المحتوى غير موجود." }, { status: 404 });
  }

  await prisma.guidanceVideo.delete({ where: { id: videoId } });
  if (existing.storageKey) {
    await deleteGuidanceVideoFile(existing.storageKey).catch(() => undefined);
  }

  return NextResponse.json({
    message: `تم حذف ${existing.mimeType?.startsWith("image/") ? "الصورة" : "الفيديو"} الإرشادي.`,
  });
}
