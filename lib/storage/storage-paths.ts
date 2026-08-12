import "server-only";

import path from "node:path";

export function getTeachixStorageRoot() {
  const configured = process.env.TEACHIX_STORAGE_ROOT?.trim();
  if (configured) return path.resolve(configured);
  if (process.env.NODE_ENV === "production") {
    throw new Error("TEACHIX_STORAGE_ROOT is required for durable storage in production.");
  }
  return path.resolve(process.cwd(), ".storage");
}

export function assertSafeStorageSegment(segment: string) {
  if (!segment || segment === "." || segment === ".." || segment.includes("\0")) {
    throw new Error("INVALID_STORAGE_SEGMENT");
  }
  if (path.isAbsolute(segment) || /^[A-Za-z]:/.test(segment) || segment.includes("/") || segment.includes("\\")) {
    throw new Error("INVALID_STORAGE_SEGMENT");
  }
  return segment;
}

export function resolveStoragePath(segments: readonly string[]) {
  if (!segments.length) throw new Error("INVALID_STORAGE_PATH");
  const root = getTeachixStorageRoot();
  const safeSegments = segments.map(assertSafeStorageSegment);
  const resolved = path.resolve(root, ...safeSegments);
  const relative = path.relative(root, resolved);
  if (!relative || relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) {
    throw new Error("INVALID_STORAGE_PATH");
  }
  return resolved;
}

export function storageKeySegments(storageKey: string) {
  if (!storageKey || storageKey.includes("\0") || storageKey.includes("\\") || path.isAbsolute(storageKey)) {
    throw new Error("INVALID_STORAGE_KEY");
  }
  return storageKey.split("/").map(assertSafeStorageSegment);
}

export function buildStoragePublicUrl(...segments: string[]) {
  return `/uploads/${segments.map((segment) => encodeURIComponent(assertSafeStorageSegment(segment))).join("/")}`;
}
