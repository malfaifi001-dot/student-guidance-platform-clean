import "server-only";

import path from "node:path";
import { buildStoragePublicUrl, assertSafeStorageSegment } from "./storage-paths";
import { readStorageFile, storageFileExists, writeStorageFile } from "./storage-provider";

export const DURABLE_UPLOAD_CATEGORIES = ["user-signatures", "school-logos", "portfolio", "activity-assignments", "expense-receipts"] as const;
export type DurableUploadCategory = (typeof DURABLE_UPLOAD_CATEGORIES)[number];

export function isSafeStorageId(value: string) {
  try { assertSafeStorageSegment(value); return /^[A-Za-z0-9_-]+$/.test(value); } catch { return false; }
}

export function isSafeUploadedFileName(value: string) {
  try { assertSafeStorageSegment(value); return path.basename(value) === value && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value); } catch { return false; }
}

export async function writeDurableUpload(category: DurableUploadCategory, ownerId: string, fileName: string, data: Uint8Array) {
  if (!isSafeStorageId(ownerId) || !isSafeUploadedFileName(fileName)) throw new Error("INVALID_UPLOAD_PATH");
  await writeStorageFile([category, ownerId, fileName], data, { exclusive: true });
  return buildStoragePublicUrl(category, ownerId, fileName);
}

export async function readDurableUpload(category: DurableUploadCategory, ownerId: string, fileName: string) {
  if (!isSafeStorageId(ownerId) || !isSafeUploadedFileName(fileName)) return null;
  const segments = [category, ownerId, fileName];
  return await storageFileExists(segments) ? readStorageFile(segments) : null;
}
