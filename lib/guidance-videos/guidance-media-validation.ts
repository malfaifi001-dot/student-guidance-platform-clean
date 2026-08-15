import type { GuidanceMediaType } from "@/lib/guidance-videos/guidance-video-config";

export const GUIDANCE_VIDEO_MAX_BYTES = 100 * 1024 * 1024;
export const GUIDANCE_VIDEO_MIME_TYPE = "video/mp4";
export const GUIDANCE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const GUIDANCE_IMAGE_MIME_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;

export function validateGuidanceVideoFileMetadata(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (file.size <= 0) return "اختر ملف فيديو صالحًا.";
  if (file.size > GUIDANCE_VIDEO_MAX_BYTES) {
    return "حجم الفيديو يتجاوز الحد الأقصى المسموح وهو 100 ميجابايت.";
  }
  if (
    file.type.toLowerCase() !== GUIDANCE_VIDEO_MIME_TYPE ||
    extension !== "mp4"
  ) {
    return "صيغة الفيديو غير مدعومة. ارفع ملف MP4 فقط.";
  }

  return null;
}

export function hasMp4Signature(buffer: Uint8Array) {
  if (buffer.byteLength < 12) return false;
  return String.fromCharCode(...buffer.subarray(4, 8)) === "ftyp";
}

export function validateGuidanceMediaFileMetadata(
  file: File,
  mediaType: GuidanceMediaType,
) {
  if (mediaType === "VIDEO") {
    const error = validateGuidanceVideoFileMetadata(file);
    return error
      ? { ok: false as const, error }
      : { ok: true as const, mimeType: GUIDANCE_VIDEO_MIME_TYPE };
  }

  const mimeType = file.type.toLowerCase();
  const expectedExtension =
    GUIDANCE_IMAGE_MIME_TYPES[
      mimeType as keyof typeof GUIDANCE_IMAGE_MIME_TYPES
    ];
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (file.size <= 0) {
    return { ok: false as const, error: "اختر ملف صورة صالحًا." };
  }
  if (file.size > GUIDANCE_IMAGE_MAX_BYTES) {
    return {
      ok: false as const,
      error: "حجم الصورة يتجاوز الحد الأقصى المسموح وهو 10 ميجابايت.",
    };
  }
  if (
    !expectedExtension ||
    (extension !== expectedExtension &&
      !(mimeType === "image/jpeg" && extension === "jpeg"))
  ) {
    return {
      ok: false as const,
      error: "صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WebP أو GIF.",
    };
  }
  return { ok: true as const, mimeType };
}

export function hasGuidanceMediaSignature(
  buffer: Uint8Array,
  mimeType: string,
) {
  if (mimeType === GUIDANCE_VIDEO_MIME_TYPE) return hasMp4Signature(buffer);
  if (mimeType === "image/jpeg") {
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }
  if (mimeType === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return (
      buffer.length >= signature.length &&
      signature.every((byte, index) => buffer[index] === byte)
    );
  }
  if (mimeType === "image/webp") {
    return (
      buffer.length >= 12 &&
      String.fromCharCode(...buffer.subarray(0, 4)) === "RIFF" &&
      String.fromCharCode(...buffer.subarray(8, 12)) === "WEBP"
    );
  }
  if (mimeType === "image/gif") {
    const header = String.fromCharCode(...buffer.subarray(0, 6));
    return header === "GIF87a" || header === "GIF89a";
  }
  return false;
}
