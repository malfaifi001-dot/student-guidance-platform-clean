import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
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
export const dynamic = "force-dynamic";

export async function GET() {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;

  const videos = await prisma.guidanceVideo.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ videos: videos.map(guidanceVideoToDto) });
}

export async function POST(request: Request) {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;

  const current = await getCurrentSessionUser();
  if (!current?.user) {
    return NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json(
      { error: "تعذر قراءة بيانات المحتوى الإرشادي." },
      { status: 400 },
    );
  }

  const metadata = parseGuidanceVideoMetadata(formData);
  if (!metadata.ok) {
    return NextResponse.json({ error: metadata.error }, { status: 400 });
  }

  const source = parseGuidanceVideoSource(formData);
  if (!source.ok) {
    return NextResponse.json({ error: source.error }, { status: 400 });
  }

  const file = getOptionalGuidanceVideoFile(formData);
  if (source.data.sourceType === "UPLOAD" && !file) {
    return NextResponse.json(
      {
        error: `اختر ملف ${source.data.mediaType === "IMAGE" ? "الصورة" : "الفيديو"} المراد رفعه.`,
      },
      { status: 400 },
    );
  }

  let storageKey: string | null = null;

  try {
    let originalFileName: string | null = null;
    let mimeType: string | null = null;
    let sizeBytes: number | null = null;

    if (source.data.sourceType === "UPLOAD" && file) {
      const validation = validateGuidanceMediaFileMetadata(
        file,
        source.data.mediaType,
      );
      if (!validation.ok) {
        return NextResponse.json(
          { error: validation.error },
          {
            status:
              file.size >
              (source.data.mediaType === "IMAGE"
                ? GUIDANCE_IMAGE_MAX_BYTES
                : GUIDANCE_VIDEO_MAX_BYTES)
                ? 413
                : 415,
          },
        );
      }

      const buffer = new Uint8Array(await file.arrayBuffer());
      if (!hasGuidanceMediaSignature(buffer, validation.mimeType)) {
        return NextResponse.json(
          { error: "محتوى الملف لا يطابق صيغته المعلنة." },
          { status: 415 },
        );
      }

      storageKey = createGuidanceMediaStorageKey(
        source.data.mediaType,
        validation.mimeType,
      );
      originalFileName = sanitizeOriginalVideoFileName(file.name);
      mimeType = validation.mimeType;
      sizeBytes = buffer.byteLength;
      await saveGuidanceVideoFile(storageKey, buffer);
    }

    const video = await prisma.guidanceVideo.create({
      data: {
        ...metadata.data,
        sourceType: source.data.sourceType,
        youtubeVideoId: source.data.youtubeVideoId,
        storageKey,
        originalFileName,
        mimeType,
        sizeBytes,
        createdById: current.user.id,
      },
    });

    return NextResponse.json(
      {
        message: `تم حفظ ${source.data.mediaType === "IMAGE" ? "الصورة" : "الفيديو"} الإرشادي بنجاح.`,
        video: guidanceVideoToDto(video),
      },
      { status: 201 },
    );
  } catch (error) {
    if (storageKey) {
      await deleteGuidanceVideoFile(storageKey).catch(() => undefined);
    }
    console.error(
      "GUIDANCE_VIDEO_CREATE_ERROR",
      error instanceof Error ? error.message : "UNKNOWN",
    );
    return NextResponse.json(
      { error: "تعذر حفظ المحتوى الإرشادي." },
      { status: 500 },
    );
  }
}
