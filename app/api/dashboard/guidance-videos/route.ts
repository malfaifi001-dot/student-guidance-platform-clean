import { NextResponse } from "next/server";

import { getCurrentSessionUser } from "@/lib/auth/current-user";
import type { GuidanceVideoPublicDto } from "@/lib/guidance-videos/guidance-video-config";
import { guidanceVideoToDto, listGuidanceVideosForRole } from "@/lib/guidance-videos/guidance-video-service";
import { isUserRole } from "@/lib/security/roles";

export const dynamic = "force-dynamic";

export async function GET() {
  const current = await getCurrentSessionUser();
  if (!current?.user) {
    return NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 });
  }
  if (!isUserRole(current.user.role)) {
    return NextResponse.json({ error: "الدور غير صالح." }, { status: 403 });
  }

  const videos = await listGuidanceVideosForRole(current.user.role);
  const publicVideos: GuidanceVideoPublicDto[] = videos.map((video) => {
    const dto = guidanceVideoToDto(video);
    return {
      id: dto.id,
      title: dto.title,
      description: dto.description,
      sourceType: dto.sourceType,
      mediaUrl: dto.mediaUrl,
      youtubeVideoId: dto.youtubeVideoId,
    };
  });
  return NextResponse.json({ videos: publicVideos });
}
