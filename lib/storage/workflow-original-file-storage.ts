import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const STORAGE_ROOT = path.resolve(process.cwd(), ".storage", "workflows");
const EXCEL_EXTENSIONS = new Set(["xlsx", "xls"]);

function cleanSegment(value: string) {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9_-]/g, "-");
  if (!cleaned) throw new Error("INVALID_STORAGE_SEGMENT");
  return cleaned;
}

function resolveStoragePath(storageKey: string) {
  const normalizedKey = storageKey.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalizedKey || normalizedKey.includes("../") || normalizedKey.includes("..\\")) {
    throw new Error("INVALID_STORAGE_KEY");
  }

  const absolutePath = path.resolve(STORAGE_ROOT, normalizedKey);
  const relativePath = path.relative(STORAGE_ROOT, absolutePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("INVALID_STORAGE_KEY");
  }

  return absolutePath;
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
  const absolutePath = resolveStoragePath(input.storageKey);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, input.buffer);
}

export async function readWorkflowOriginalFile(storageKey: string) {
  return readFile(resolveStoragePath(storageKey));
}

export async function workflowOriginalFileExists(storageKey: string) {
  try {
    return (await stat(resolveStoragePath(storageKey))).isFile();
  } catch {
    return false;
  }
}

export async function deleteWorkflowOriginalFile(storageKey?: string | null) {
  if (!storageKey) return;
  await rm(resolveStoragePath(storageKey), { force: true });
}
