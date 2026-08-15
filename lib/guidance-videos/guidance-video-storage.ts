import "server-only";

import { randomUUID } from "node:crypto";

import {
  deleteStorageFile,
  readStorageFile,
  storageFileExists,
  writeStorageFile,
} from "@/lib/storage/storage-provider";
import { storageKeySegments } from "@/lib/storage/storage-paths";
import type { GuidanceMediaType } from "@/lib/guidance-videos/guidance-video-config";
import { GUIDANCE_IMAGE_MIME_TYPES } from "@/lib/guidance-videos/guidance-media-validation";

export {
  GUIDANCE_IMAGE_MAX_BYTES,
  GUIDANCE_VIDEO_MAX_BYTES,
  GUIDANCE_VIDEO_MIME_TYPE,
  hasGuidanceMediaSignature,
  hasMp4Signature,
  validateGuidanceMediaFileMetadata,
  validateGuidanceVideoFileMetadata,
} from "@/lib/guidance-videos/guidance-media-validation";

export function createGuidanceVideoStorageKey() {
  return `guidance-videos/guidance-video-${randomUUID()}.mp4`;
}

export function createGuidanceMediaStorageKey(
  mediaType: GuidanceMediaType,
  mimeType: string,
) {
  if (mediaType === "VIDEO") return createGuidanceVideoStorageKey();
  const extension =
    GUIDANCE_IMAGE_MIME_TYPES[
      mimeType as keyof typeof GUIDANCE_IMAGE_MIME_TYPES
    ];
  if (!extension) throw new Error("UNSUPPORTED_GUIDANCE_IMAGE_TYPE");
  return `guidance-images/guidance-image-${randomUUID()}.${extension}`;
}

function guidanceMediaStorageSegments(storageKey: string) {
  const segments = storageKeySegments(storageKey);
  const validVideo =
    segments[0] === "guidance-videos" &&
    /^guidance-video-[0-9a-f-]{36}\.mp4$/i.test(segments[1] ?? "");
  const validImage =
    segments[0] === "guidance-images" &&
    /^guidance-image-[0-9a-f-]{36}\.(?:jpg|png|webp|gif)$/i.test(
      segments[1] ?? "",
    );
  if (segments.length !== 2 || (!validVideo && !validImage)) {
    throw new Error("INVALID_GUIDANCE_VIDEO_STORAGE_KEY");
  }
  return segments;
}

export async function saveGuidanceVideoFile(
  storageKey: string,
  data: Uint8Array,
) {
  return writeStorageFile(guidanceMediaStorageSegments(storageKey), data, {
    exclusive: true,
  });
}

export async function readGuidanceVideoFile(storageKey: string) {
  return readStorageFile(guidanceMediaStorageSegments(storageKey));
}

export async function guidanceVideoFileExists(storageKey: string) {
  return storageFileExists(guidanceMediaStorageSegments(storageKey));
}

export async function deleteGuidanceVideoFile(storageKey: string) {
  return deleteStorageFile(guidanceMediaStorageSegments(storageKey));
}
