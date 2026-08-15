import type { UserRole } from "@/lib/security/roles";

export const GUIDANCE_VIDEO_SOURCE_TYPES = ["UPLOAD", "YOUTUBE"] as const;
export type GuidanceVideoSourceType =
  (typeof GUIDANCE_VIDEO_SOURCE_TYPES)[number];

export const GUIDANCE_MEDIA_TYPES = ["VIDEO", "IMAGE"] as const;
export type GuidanceMediaType = (typeof GUIDANCE_MEDIA_TYPES)[number];

export function isGuidanceVideoSourceType(
  value: unknown,
): value is GuidanceVideoSourceType {
  return (
    typeof value === "string" &&
    GUIDANCE_VIDEO_SOURCE_TYPES.includes(value as GuidanceVideoSourceType)
  );
}

export const GUIDANCE_VIDEO_TARGET_ROLES = [
  "COUNSELOR",
  "ACTIVITY_LEADER",
  "TEACHER",
  "PRINCIPAL",
] as const satisfies readonly UserRole[];

export type GuidanceVideoTargetRole =
  (typeof GUIDANCE_VIDEO_TARGET_ROLES)[number];

export const GUIDANCE_VIDEO_ROLE_LABELS: Record<
  GuidanceVideoTargetRole,
  string
> = {
  COUNSELOR: "الموجه الطلابي",
  ACTIVITY_LEADER: "رائد النشاط",
  TEACHER: "المعلم",
  PRINCIPAL: "مدير المدرسة",
};

export function isGuidanceVideoTargetRole(
  value: unknown,
): value is GuidanceVideoTargetRole {
  return (
    typeof value === "string" &&
    GUIDANCE_VIDEO_TARGET_ROLES.includes(value as GuidanceVideoTargetRole)
  );
}

export function parseGuidanceVideoTargetRoles(
  value: unknown,
): GuidanceVideoTargetRole[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter(isGuidanceVideoTargetRole)));
}

export type GuidanceVideoDto = {
  id: string;
  title: string;
  description: string | null;
  sourceType: GuidanceVideoSourceType;
  mediaType: GuidanceMediaType;
  originalFileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  youtubeVideoId: string | null;
  targetRoles: GuidanceVideoTargetRole[];
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  mediaUrl: string | null;
};

export type GuidanceVideoPlayable = Pick<
  GuidanceVideoDto,
  | "id"
  | "title"
  | "description"
  | "sourceType"
  | "mediaType"
  | "mediaUrl"
  | "youtubeVideoId"
>;

export type GuidanceVideoPublicDto = GuidanceVideoPlayable;
