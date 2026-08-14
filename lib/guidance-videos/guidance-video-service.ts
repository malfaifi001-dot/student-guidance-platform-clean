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
  return {
    id: video.id,
    title: video.title,
    description: video.description,
    originalFileName: video.originalFileName,
    mimeType: video.mimeType,
    sizeBytes: video.sizeBytes,
    targetRoles: parseGuidanceVideoTargetRoles(video.targetRoles),
    isPublished: video.isPublished,
    sortOrder: video.sortOrder,
    createdAt: video.createdAt.toISOString(),
    updatedAt: video.updatedAt.toISOString(),
    mediaUrl: `/api/dashboard/guidance-videos/${encodeURIComponent(video.id)}/media`,
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
