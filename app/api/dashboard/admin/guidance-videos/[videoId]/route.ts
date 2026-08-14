import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { parseGuidanceVideoTargetRoles } from "@/lib/guidance-videos/guidance-video-config";
import {
  getOptionalGuidanceVideoFile,
  parseGuidanceVideoMetadata,
  sanitizeOriginalVideoFileName,
} from "@/lib/guidance-videos/guidance-video-input";
import { guidanceVideoToDto } from "@/lib/guidance-videos/guidance-video-service";
import {
  createGuidanceVideoStorageKey,
  deleteGuidanceVideoFile,
  GUIDANCE_VIDEO_MIME_TYPE,
  hasMp4Signature,
  saveGuidanceVideoFile,
  validateGuidanceVideoFileMetadata,
} from "@/lib/guidance-videos/guidance-video-storage";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ videoId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;

  const { videoId } = await context.params;
  const existing = await prisma.guidanceVideo.findUnique({ where: { id: videoId } });
  if (!existing) {
    return NextResponse.json({ error: "الفيديو غير موجود." }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "تعذر قراءة بيانات الفيديو." }, { status: 400 });
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

  const replacement = getOptionalGuidanceVideoFile(formData);
  let nextStorageKey = existing.storageKey;
  let nextOriginalName = existing.originalFileName;
  let nextSizeBytes = existing.sizeBytes;
  let replacementSaved = false;

  try {
    if (replacement) {
      const fileError = validateGuidanceVideoFileMetadata(replacement);
      if (fileError) {
        return NextResponse.json(
          { error: fileError },
          { status: replacement.size > 100 * 1024 * 1024 ? 413 : 415 },
        );
      }

      const buffer = new Uint8Array(await replacement.arrayBuffer());
      if (!hasMp4Signature(buffer)) {
        return NextResponse.json({ error: "محتوى ملف MP4 غير صالح." }, { status: 415 });
      }

      nextStorageKey = createGuidanceVideoStorageKey();
      nextOriginalName = sanitizeOriginalVideoFileName(replacement.name);
      nextSizeBytes = buffer.byteLength;
      await saveGuidanceVideoFile(nextStorageKey, buffer);
      replacementSaved = true;
    }

    const video = await prisma.guidanceVideo.update({
      where: { id: videoId },
      data: {
        ...metadata.data,
        storageKey: nextStorageKey,
        originalFileName: nextOriginalName,
        mimeType: GUIDANCE_VIDEO_MIME_TYPE,
        sizeBytes: nextSizeBytes,
      },
    });

    if (replacementSaved) {
      await deleteGuidanceVideoFile(existing.storageKey).catch(() => undefined);
    }

    return NextResponse.json({ message: "تم تحديث الفيديو بنجاح.", video: guidanceVideoToDto(video) });
  } catch (error) {
    if (replacementSaved) {
      await deleteGuidanceVideoFile(nextStorageKey).catch(() => undefined);
    }
    console.error("GUIDANCE_VIDEO_UPDATE_ERROR", error instanceof Error ? error.message : "UNKNOWN");
    return NextResponse.json({ error: "تعذر تحديث الفيديو الإرشادي." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;

  const { videoId } = await context.params;
  const existing = await prisma.guidanceVideo.findUnique({ where: { id: videoId } });
  if (!existing) {
    return NextResponse.json({ error: "الفيديو غير موجود." }, { status: 404 });
  }

  await prisma.guidanceVideo.delete({ where: { id: videoId } });
  await deleteGuidanceVideoFile(existing.storageKey).catch(() => undefined);

  return NextResponse.json({ message: "تم حذف الفيديو الإرشادي." });
}
