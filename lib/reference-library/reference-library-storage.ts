import { randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

const configuredStorageRoot =
  process.env.REFERENCE_LIBRARY_STORAGE_ROOT?.trim();

const STORAGE_ROOT = configuredStorageRoot
  ? path.resolve(configuredStorageRoot)
  : path.resolve(process.cwd(), ".storage", "reference-library");

function resolveStoragePath(storageKey: string) {
  const normalizedKey = storageKey.replace(/\\/g, "/").replace(/^\/+/, "");

  if (
    !normalizedKey ||
    normalizedKey.includes("../") ||
    normalizedKey.includes("..\\")
  ) {
    throw new Error("INVALID_STORAGE_KEY");
  }

  const absolutePath = path.resolve(STORAGE_ROOT, normalizedKey);
  const relativePath = path.relative(STORAGE_ROOT, absolutePath);

  if (
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error("INVALID_STORAGE_KEY");
  }

  return absolutePath;
}

export function createReferenceLibraryStorageKey(extension: string) {
  const date = new Date();
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const safeExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (!safeExtension) {
    throw new Error("INVALID_FILE_EXTENSION");
  }

  return `${year}/${month}/${randomUUID()}.${safeExtension}`;
}

export async function saveReferenceLibraryFile(input: {
  storageKey: string;
  buffer: Uint8Array;
}) {
  const absolutePath = resolveStoragePath(input.storageKey);

  await mkdir(path.dirname(absolutePath), {
    recursive: true,
  });

  await writeFile(absolutePath, input.buffer);

  return {
    storageKey: input.storageKey,
    sizeBytes: input.buffer.byteLength,
  };
}

export async function readReferenceLibraryFile(storageKey: string) {
  const absolutePath = resolveStoragePath(storageKey);
  return readFile(absolutePath);
}

export async function referenceLibraryFileExists(storageKey: string) {
  try {
    const absolutePath = resolveStoragePath(storageKey);
    const fileStat = await stat(absolutePath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

export async function deleteReferenceLibraryFile(
  storageKey: string | null | undefined,
) {
  if (!storageKey) {
    return;
  }

  const absolutePath = resolveStoragePath(storageKey);

  await rm(absolutePath, {
    force: true,
  });
}
