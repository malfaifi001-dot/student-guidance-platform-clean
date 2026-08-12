import "server-only";

import path from "path";
import { resolveStorageFile, storageFileExists, writeStorageFile } from "@/lib/storage/storage-provider";
import { buildStoragePublicUrl } from "@/lib/storage/storage-paths";

export const SCHOOL_SIGNATURE_PUBLIC_PREFIX = "/uploads/school-signatures/";

export function isSafeSchoolSignatureOwnerId(value: string): boolean {
  if (!value || value === "." || value === ".." || value.includes("\0")) {
    return false;
  }

  return /^[A-Za-z0-9_-]+$/.test(value);
}

export function isSafeSchoolSignatureFileName(fileName: string): boolean {
  if (
    !fileName ||
    fileName === "." ||
    fileName === ".." ||
    fileName.includes("\0")
  ) {
    return false;
  }

  if (
    path.basename(fileName) !== fileName ||
    path.posix.basename(fileName) !== fileName ||
    path.win32.basename(fileName) !== fileName
  ) {
    return false;
  }

  return /^[A-Za-z0-9][A-Za-z0-9._-]*\.png$/i.test(fileName);
}

export async function writeSchoolSignatureFile(
  schoolAccountId: string,
  fileName: string,
  data: Uint8Array,
) {
  if (!isSafeSchoolSignatureOwnerId(schoolAccountId)) {
    throw new Error("Invalid school account id.");
  }

  if (!isSafeSchoolSignatureFileName(fileName)) {
    throw new Error("Invalid school signature file name.");
  }

  return writeStorageFile(["school-signatures", schoolAccountId, fileName], data, { exclusive: true });
}

export async function resolveExistingSchoolSignatureFile(
  schoolAccountId: string,
  fileName: string,
) {
  if (
    !isSafeSchoolSignatureOwnerId(schoolAccountId) ||
    !isSafeSchoolSignatureFileName(fileName)
  ) {
    return null;
  }

  const segments = ["school-signatures", schoolAccountId, fileName];
  return await storageFileExists(segments) ? resolveStorageFile(segments) : null;
}

export function getSchoolSignaturePublicUrl(
  schoolAccountId: string,
  fileName: string,
) {
  if (
    !isSafeSchoolSignatureOwnerId(schoolAccountId) ||
    !isSafeSchoolSignatureFileName(fileName)
  ) {
    return "";
  }

  return buildStoragePublicUrl("school-signatures", schoolAccountId, fileName);
}
