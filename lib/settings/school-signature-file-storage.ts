import "server-only";

import { mkdir, stat, writeFile } from "fs/promises";
import path from "path";

export const SCHOOL_SIGNATURE_PUBLIC_PREFIX = "/uploads/school-signatures/";

export function getSchoolSignaturePersistentStorageRoot() {
  return path.resolve(process.cwd(), ".storage", "school-signatures");
}

export function getSchoolSignatureLegacyStorageRoot() {
  return path.resolve(process.cwd(), "public", "uploads", "school-signatures");
}

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

function resolveOwnerDirectory(root: string, schoolAccountId: string) {
  if (!isSafeSchoolSignatureOwnerId(schoolAccountId)) {
    return null;
  }

  const resolved = path.resolve(root, schoolAccountId);
  const relative = path.relative(root, resolved);

  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }

  return resolved;
}

function resolveSignatureFilePath(
  root: string,
  schoolAccountId: string,
  fileName: string,
) {
  const ownerDirectory = resolveOwnerDirectory(root, schoolAccountId);

  if (!ownerDirectory || !isSafeSchoolSignatureFileName(fileName)) {
    return null;
  }

  const resolved = path.resolve(ownerDirectory, fileName);
  const relative = path.relative(ownerDirectory, resolved);

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

export async function writeSchoolSignatureFile(
  schoolAccountId: string,
  fileName: string,
  data: Uint8Array,
) {
  const root = getSchoolSignaturePersistentStorageRoot();
  const ownerDirectory = resolveOwnerDirectory(root, schoolAccountId);

  if (!ownerDirectory) {
    throw new Error("Invalid school account id.");
  }

  const filePath = resolveSignatureFilePath(
    root,
    schoolAccountId,
    fileName,
  );

  if (!filePath) {
    throw new Error("Invalid school signature file name.");
  }

  await mkdir(ownerDirectory, { recursive: true });
  await writeFile(filePath, data, { flag: "wx" });

  return filePath;
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

  const roots = [
    getSchoolSignaturePersistentStorageRoot(),
    getSchoolSignatureLegacyStorageRoot(),
  ];

  for (const root of roots) {
    const filePath = resolveSignatureFilePath(
      root,
      schoolAccountId,
      fileName,
    );

    if (filePath && (await isRegularFile(filePath))) {
      return filePath;
    }
  }

  return null;
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

  return `${SCHOOL_SIGNATURE_PUBLIC_PREFIX}${schoolAccountId}/${fileName}`;
}