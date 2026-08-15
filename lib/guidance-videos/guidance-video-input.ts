import {
  isGuidanceVideoSourceType,
  parseGuidanceVideoTargetRoles,
  type GuidanceVideoSourceType,
  type GuidanceVideoTargetRole,
  type GuidanceMediaType,
} from "@/lib/guidance-videos/guidance-video-config";
import { parseYouTubeVideoUrl } from "@/lib/guidance-videos/youtube";

export type GuidanceVideoMetadataInput = {
  title: string;
  description: string | null;
  targetRoles: GuidanceVideoTargetRole[];
  isPublished: boolean;
  sortOrder: number;
};

function parseBoolean(value: FormDataEntryValue | null, fallback: boolean) {
  if (value === null) return fallback;
  return String(value).toLowerCase() === "true";
}

function parseRoles(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  try {
    return parseGuidanceVideoTargetRoles(JSON.parse(value));
  } catch {
    return [];
  }
}

export function parseGuidanceVideoMetadata(
  formData: FormData,
  fallback?: GuidanceVideoMetadataInput,
) {
  const title = String(formData.get("title") ?? fallback?.title ?? "").trim();
  const rawDescription = String(
    formData.get("description") ?? fallback?.description ?? "",
  ).trim();
  const targetRoles = formData.has("targetRoles")
    ? parseRoles(formData.get("targetRoles"))
    : (fallback?.targetRoles ?? []);
  const rawSortOrder = Number(
    formData.get("sortOrder") ?? fallback?.sortOrder ?? 0,
  );

  if (!title) return { ok: false as const, error: "عنوان المحتوى مطلوب." };
  if (title.length > 200) {
    return { ok: false as const, error: "عنوان المحتوى طويل جدًا." };
  }
  if (rawDescription.length > 2000) {
    return { ok: false as const, error: "وصف المحتوى طويل جدًا." };
  }
  if (!targetRoles.length) {
    return { ok: false as const, error: "اختر فئة مستهدفة واحدة على الأقل." };
  }
  if (
    !Number.isSafeInteger(rawSortOrder) ||
    rawSortOrder < 0 ||
    rawSortOrder > 100000
  ) {
    return { ok: false as const, error: "ترتيب الظهور غير صالح." };
  }

  return {
    ok: true as const,
    data: {
      title,
      description: rawDescription || null,
      targetRoles,
      isPublished: parseBoolean(
        formData.get("isPublished"),
        fallback?.isPublished ?? false,
      ),
      sortOrder: rawSortOrder,
    } satisfies GuidanceVideoMetadataInput,
  };
}

export function getOptionalGuidanceVideoFile(formData: FormData) {
  const value = formData.get("media") ?? formData.get("video");
  return value instanceof File && value.size > 0 ? value : null;
}

export function parseGuidanceVideoSource(
  formData: FormData,
  fallback?: {
    sourceType: GuidanceVideoSourceType;
    youtubeVideoId: string | null;
    mediaType?: GuidanceMediaType;
  },
) {
  const rawSourceType = formData.get("sourceType");
  const sourceType =
    rawSourceType === null
      ? (fallback?.sourceType ?? "UPLOAD")
      : String(rawSourceType);

  if (!isGuidanceVideoSourceType(sourceType)) {
    return { ok: false as const, error: "مصدر المحتوى غير صالح." };
  }

  const rawMediaType = String(
    formData.get("mediaType") ?? fallback?.mediaType ?? "VIDEO",
  );
  if (rawMediaType !== "VIDEO" && rawMediaType !== "IMAGE") {
    return { ok: false as const, error: "نوع المحتوى غير صالح." };
  }
  const mediaType: GuidanceMediaType = rawMediaType;

  if (sourceType === "YOUTUBE") {
    if (mediaType !== "VIDEO") {
      return { ok: false as const, error: "روابط YouTube متاحة للفيديو فقط." };
    }
    const rawYouTubeUrl = formData.get("youtubeUrl");
    const youtubeVideoId =
      rawYouTubeUrl === null
        ? fallback?.youtubeVideoId
        : parseYouTubeVideoUrl(rawYouTubeUrl);
    if (!youtubeVideoId) {
      return { ok: false as const, error: "رابط YouTube غير صالح." };
    }
    return {
      ok: true as const,
      data: { sourceType, youtubeVideoId, mediaType },
    };
  }

  return {
    ok: true as const,
    data: { sourceType, youtubeVideoId: null, mediaType },
  };
}

export function sanitizeOriginalVideoFileName(value: string) {
  return (
    value
      .replace(/[\r\n\0]/g, "")
      .replace(/[\\/]/g, "-")
      .trim()
      .slice(0, 255) || "guidance-media"
  );
}
