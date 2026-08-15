import "server-only";

import type { GuidanceVideo } from "@prisma/client";

import {
  type GuidanceVideoDto,
  isGuidanceVideoTargetRole,
  parseGuidanceVideoTargetRoles,
} from "@/lib/guidance-videos/guidance-video-config";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/lib/security/roles";

export function guidanceVideoToDto(video: GuidanceVideo): GuidanceVideoDto {
  const mediaType =
    video.sourceType === "UPLOAD" && video.mimeType?.startsWith("image/")
      ? "IMAGE"
      : "VIDEO";
  return {
    id: video.id,
    title: video.title,
    description: video.description,
    sourceType: video.sourceType,
    mediaType,
    originalFileName: video.originalFileName,
    mimeType: video.mimeType,
    sizeBytes: video.sizeBytes,
    youtubeVideoId: video.youtubeVideoId,
    targetRoles: parseGuidanceVideoTargetRoles(video.targetRoles),
    isPublished: video.isPublished,
    sortOrder: video.sortOrder,
    createdAt: video.createdAt.toISOString(),
    updatedAt: video.updatedAt.toISOString(),
    mediaUrl:
      video.sourceType === "UPLOAD"
        ? `/api/dashboard/guidance-videos/${encodeURIComponent(video.id)}/media`
        : null,
  };
}

export function canRoleViewGuidanceVideo(
  video: Pick<GuidanceVideo, "isPublished" | "targetRoles">,
  role: UserRole,
) {
  if (role === "ADMIN") return true;
  return (
    video.isPublished &&
    isGuidanceVideoTargetRole(role) &&
    parseGuidanceVideoTargetRoles(video.targetRoles).includes(role)
  );
}

export async function listGuidanceVideosForRole(role: UserRole) {
  const videos = await prisma.guidanceVideo.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return videos.filter((video) => canRoleViewGuidanceVideo(video, role));
}
