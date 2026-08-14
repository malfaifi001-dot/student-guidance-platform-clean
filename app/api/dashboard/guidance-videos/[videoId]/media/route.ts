import { NextResponse } from "next/server";

import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { canRoleViewGuidanceVideo } from "@/lib/guidance-videos/guidance-video-service";
import {
  guidanceVideoFileExists,
  readGuidanceVideoFile,
} from "@/lib/guidance-videos/guidance-video-storage";
import { prisma } from "@/lib/prisma";
import { isUserRole } from "@/lib/security/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ videoId: string }> };

function parseRange(value: string, totalLength: number) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match) return null;
  const start = match[1] ? Number(match[1]) : 0;
  const end = Math.min(match[2] ? Number(match[2]) : totalLength - 1, totalLength - 1);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || start >= totalLength) {
    return null;
  }
  return { start, end };
}

export async function GET(request: Request, context: RouteContext) {
  const current = await getCurrentSessionUser();
  if (!current?.user) {
    return NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 });
  }
  if (!isUserRole(current.user.role)) {
    return NextResponse.json({ error: "ليست لديك صلاحية مشاهدة الفيديو." }, { status: 403 });
  }

  const { videoId } = await context.params;
  const video = await prisma.guidanceVideo.findUnique({ where: { id: videoId } });
  if (!video || !canRoleViewGuidanceVideo(video, current.user.role)) {
    return NextResponse.json({ error: "الفيديو غير موجود." }, { status: 404 });
  }
  if (video.sourceType !== "UPLOAD" || !video.storageKey || !video.mimeType) {
    return NextResponse.json({ error: "ملف الفيديو غير متاح." }, { status: 404 });
  }
  if (!(await guidanceVideoFileExists(video.storageKey))) {
    return NextResponse.json({ error: "ملف الفيديو غير متاح." }, { status: 404 });
  }

  const buffer = await readGuidanceVideoFile(video.storageKey);
  const headers = new Headers({
    "Content-Type": video.mimeType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  });
  const rangeHeader = request.headers.get("range");

  if (rangeHeader) {
    const range = parseRange(rangeHeader, buffer.length);
    if (!range) {
      headers.set("Content-Range", `bytes */${buffer.length}`);
      return new Response(null, { status: 416, headers });
    }
    const chunk = buffer.subarray(range.start, range.end + 1);
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${buffer.length}`);
    headers.set("Content-Length", String(chunk.length));
    return new Response(Uint8Array.from(chunk), { status: 206, headers });
  }

  headers.set("Content-Length", String(buffer.length));
  return new Response(Uint8Array.from(buffer), { status: 200, headers });
}
