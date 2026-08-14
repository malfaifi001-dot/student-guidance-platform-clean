import type { UserRole } from "@/lib/security/roles";

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
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  targetRoles: GuidanceVideoTargetRole[];
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  mediaUrl: string;
};

export type GuidanceVideoPlayable = Pick<
  GuidanceVideoDto,
  "id" | "title" | "description" | "mediaUrl"
>;

export type GuidanceVideoPublicDto = GuidanceVideoPlayable;
