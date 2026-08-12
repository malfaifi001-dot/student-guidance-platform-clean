import { randomUUID } from "node:crypto";
import path from "node:path";
import { deleteStorageFile, readStorageFile, storageFileExists, writeStorageFile } from "./storage-provider";
import { storageKeySegments } from "./storage-paths";
const segments = (storageKey: string) => ["workflows", ...storageKeySegments(storageKey)];
const EXCEL_EXTENSIONS = new Set(["xlsx", "xls"]);

function cleanSegment(value: string) {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9_-]/g, "-");
  if (!cleaned) throw new Error("INVALID_STORAGE_SEGMENT");
  return cleaned;
}

export function getWorkflowExcelExtension(fileName: string) {
  const extension = path.extname(fileName).slice(1).toLowerCase();
  return EXCEL_EXTENSIONS.has(extension) ? extension : null;
}

export function createWorkflowOriginalFileStorageKey(input: {
  serviceSlug: string;
  workflowId: string;
  extension: string;
}) {
  const extension = input.extension.toLowerCase();
  if (!EXCEL_EXTENSIONS.has(extension)) throw new Error("INVALID_EXCEL_EXTENSION");

  return `${cleanSegment(input.serviceSlug)}/${cleanSegment(input.workflowId)}/${randomUUID()}.${extension}`;
}

export async function saveWorkflowOriginalFile(input: {
  storageKey: string;
  buffer: Uint8Array;
}) {
  await writeStorageFile(segments(input.storageKey), input.buffer);
}

export async function readWorkflowOriginalFile(storageKey: string) {
  return readStorageFile(segments(storageKey));
}

export async function workflowOriginalFileExists(storageKey: string) {
  try {
    return storageFileExists(segments(storageKey));
  } catch {
    return false;
  }
}

export async function deleteWorkflowOriginalFile(storageKey?: string | null) {
  if (!storageKey) return;
  await deleteStorageFile(segments(storageKey));
}
