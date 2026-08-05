import "server-only";

import { mkdir, stat, unlink, writeFile } from "fs/promises";
import path from "path";

export const EVIDENCE_PUBLIC_PREFIX = "/uploads/evidence/";

const EVIDENCE_MIME_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
} as const;

export type EvidenceFileExtension = keyof typeof EVIDENCE_MIME_TYPES;

export function getEvidencePersistentStorageRoot() {
  return path.resolve(process.cwd(), ".storage", "evidence");
}

export function getEvidenceLegacyStorageRoot() {
  return path.resolve(process.cwd(), "public", "uploads", "evidence");
}

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

function resolveEvidenceFilePath(root: string, fileName: string) {
  if (!isSafeEvidenceStoredFileName(fileName)) return null;

  const resolved = path.resolve(root, fileName);
  const relative = path.relative(root, resolved);

  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }

  return resolved;
}

async function isRegularFile(filePath: string) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

export async function resolveExistingEvidenceFile(fileName: string) {
  if (!isSafeEvidenceStoredFileName(fileName)) return null;

  for (const root of [getEvidencePersistentStorageRoot(), getEvidenceLegacyStorageRoot()]) {
    const filePath = resolveEvidenceFilePath(root, fileName);
    if (filePath && await isRegularFile(filePath)) return filePath;
  }

  return null;
}

export async function writeEvidenceFile(fileName: string, data: Uint8Array) {
  const root = getEvidencePersistentStorageRoot();
  const filePath = resolveEvidenceFilePath(root, fileName);
  if (!filePath) throw new Error("Invalid evidence file name.");

  await mkdir(root, { recursive: true });
  await writeFile(filePath, data, { flag: "wx" });
  return filePath;
}

export async function deleteEvidenceFile(fileName: string) {
  if (!isSafeEvidenceStoredFileName(fileName)) return 0;

  let failures = 0;
  for (const root of [getEvidencePersistentStorageRoot(), getEvidenceLegacyStorageRoot()]) {
    const filePath = resolveEvidenceFilePath(root, fileName);
    if (!filePath) continue;

    try {
      await unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") failures += 1;
    }
  }

  return failures;
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
