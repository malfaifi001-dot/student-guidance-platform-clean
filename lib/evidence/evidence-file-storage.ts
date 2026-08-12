import "server-only";

import path from "path";
import { deleteStorageFile, resolveStorageFile, storageFileExists, writeStorageFile } from "@/lib/storage/storage-provider";

export const EVIDENCE_PUBLIC_PREFIX = "/uploads/evidence/";

const EVIDENCE_MIME_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
} as const;

export type EvidenceFileExtension = keyof typeof EVIDENCE_MIME_TYPES;

export function isSafeEvidenceStoredFileName(fileName: string): boolean {
  if (!fileName || fileName === "." || fileName === ".." || fileName.includes("\0")) {
    return false;
  }

  if (
    path.basename(fileName) !== fileName ||
    path.posix.basename(fileName) !== fileName ||
    path.win32.basename(fileName) !== fileName
  ) {
    return false;
  }

  return /^[A-Za-z0-9][A-Za-z0-9._-]*\.(?:jpe?g|png|webp|pdf)$/i.test(fileName);
}

export async function resolveExistingEvidenceFile(fileName: string) {
  if (!isSafeEvidenceStoredFileName(fileName)) return null;
  return await storageFileExists(["evidence", fileName]) ? resolveStorageFile(["evidence", fileName]) : null;
}

export async function writeEvidenceFile(fileName: string, data: Uint8Array) {
  if (!isSafeEvidenceStoredFileName(fileName)) throw new Error("Invalid evidence file name.");
  return writeStorageFile(["evidence", fileName], data, { exclusive: true });
}

export async function deleteEvidenceFile(fileName: string): Promise<number> {
  if (!isSafeEvidenceStoredFileName(fileName)) return 0;

  try { await deleteStorageFile(["evidence", fileName]); return 0; } catch { return 1; }
}

export function getEvidenceStoredFileNameFromUrl(fileUrl: string) {
  if (!fileUrl.startsWith(EVIDENCE_PUBLIC_PREFIX)) return null;
  const fileName = fileUrl.slice(EVIDENCE_PUBLIC_PREFIX.length);
  return isSafeEvidenceStoredFileName(fileName) ? fileName : null;
}

export function getEvidenceMimeType(fileName: string) {
  if (!isSafeEvidenceStoredFileName(fileName)) return null;
  const extension = path.extname(fileName).slice(1).toLowerCase() as EvidenceFileExtension;
  return EVIDENCE_MIME_TYPES[extension] || null;
}
