import { randomUUID } from "node:crypto";
import { deleteStorageFile, readStorageFile, storageFileExists, writeStorageFile } from "@/lib/storage/storage-provider";
import { storageKeySegments } from "@/lib/storage/storage-paths";
const segments = (storageKey: string) => ["reference-library", ...storageKeySegments(storageKey)];

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
  await writeStorageFile(segments(input.storageKey), input.buffer);

  return {
    storageKey: input.storageKey,
    sizeBytes: input.buffer.byteLength,
  };
}

export async function readReferenceLibraryFile(storageKey: string) {
  return new Uint8Array(await readStorageFile(segments(storageKey)));
}

export async function referenceLibraryFileExists(storageKey: string) {
  return storageFileExists(segments(storageKey));
}

export async function deleteReferenceLibraryFile(
  storageKey: string | null | undefined,
) {
  if (!storageKey) {
    return;
  }

  await deleteStorageFile(segments(storageKey));
}
