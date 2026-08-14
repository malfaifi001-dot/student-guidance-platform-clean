import "server-only";

import { randomUUID } from "node:crypto";

import {
  deleteStorageFile,
  readStorageFile,
  storageFileExists,
  writeStorageFile,
} from "@/lib/storage/storage-provider";
import { storageKeySegments } from "@/lib/storage/storage-paths";

export const GUIDANCE_VIDEO_MAX_BYTES = 100 * 1024 * 1024;
export const GUIDANCE_VIDEO_MIME_TYPE = "video/mp4";

export function createGuidanceVideoStorageKey() {
  return `guidance-videos/guidance-video-${randomUUID()}.mp4`;
}

function guidanceVideoStorageSegments(storageKey: string) {
  const segments = storageKeySegments(storageKey);
  if (
    segments.length !== 2 ||
    segments[0] !== "guidance-videos" ||
    !/^guidance-video-[0-9a-f-]{36}\.mp4$/i.test(segments[1])
  ) {
    throw new Error("INVALID_GUIDANCE_VIDEO_STORAGE_KEY");
  }
  return segments;
}

export function validateGuidanceVideoFileMetadata(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (file.size <= 0) return "اختر ملف فيديو صالحًا.";
  if (file.size > GUIDANCE_VIDEO_MAX_BYTES) {
    return "حجم الفيديو يتجاوز الحد الأقصى المسموح وهو 100 ميجابايت.";
  }
  if (file.type.toLowerCase() !== GUIDANCE_VIDEO_MIME_TYPE || extension !== "mp4") {
    return "صيغة الفيديو غير مدعومة. ارفع ملف MP4 فقط.";
  }

  return null;
}

export function hasMp4Signature(buffer: Uint8Array) {
  if (buffer.byteLength < 12) return false;
  return String.fromCharCode(...buffer.subarray(4, 8)) === "ftyp";
}

export async function saveGuidanceVideoFile(storageKey: string, data: Uint8Array) {
  return writeStorageFile(guidanceVideoStorageSegments(storageKey), data, { exclusive: true });
}

export async function readGuidanceVideoFile(storageKey: string) {
  return readStorageFile(guidanceVideoStorageSegments(storageKey));
}

export async function guidanceVideoFileExists(storageKey: string) {
  return storageFileExists(guidanceVideoStorageSegments(storageKey));
}

export async function deleteGuidanceVideoFile(storageKey: string) {
  return deleteStorageFile(guidanceVideoStorageSegments(storageKey));
}
