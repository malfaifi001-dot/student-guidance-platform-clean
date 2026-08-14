import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
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
    return NextResponse.json({ error: "تعذر قراءة بيانات الفيديو." }, { status: 400 });
  }

  const metadata = parseGuidanceVideoMetadata(formData);
  if (!metadata.ok) {
    return NextResponse.json({ error: metadata.error }, { status: 400 });
  }

  const file = getOptionalGuidanceVideoFile(formData);
  if (!file) {
    return NextResponse.json({ error: "اختر ملف الفيديو المراد رفعه." }, { status: 400 });
  }

  const fileError = validateGuidanceVideoFileMetadata(file);
  if (fileError) {
    return NextResponse.json(
      { error: fileError },
      { status: file.size > 100 * 1024 * 1024 ? 413 : 415 },
    );
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  if (!hasMp4Signature(buffer)) {
    return NextResponse.json({ error: "محتوى ملف MP4 غير صالح." }, { status: 415 });
  }

  const storageKey = createGuidanceVideoStorageKey();

  try {
    await saveGuidanceVideoFile(storageKey, buffer);
    const video = await prisma.guidanceVideo.create({
      data: {
        ...metadata.data,
        storageKey,
        originalFileName: sanitizeOriginalVideoFileName(file.name),
        mimeType: GUIDANCE_VIDEO_MIME_TYPE,
        sizeBytes: buffer.byteLength,
        createdById: current.user.id,
      },
    });

    return NextResponse.json(
      { message: "تم رفع الفيديو الإرشادي بنجاح.", video: guidanceVideoToDto(video) },
      { status: 201 },
    );
  } catch (error) {
    await deleteGuidanceVideoFile(storageKey).catch(() => undefined);
    console.error("GUIDANCE_VIDEO_CREATE_ERROR", error instanceof Error ? error.message : "UNKNOWN");
    return NextResponse.json({ error: "تعذر حفظ الفيديو الإرشادي." }, { status: 500 });
  }
}
