import "server-only";

import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveStoragePath } from "./storage-paths";
import type { StorageProvider } from "./storage-types";

export const localPersistentStorage: StorageProvider = {
  resolve: resolveStoragePath,
  async write(segments, data, options) {
    const filePath = resolveStoragePath(segments);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data, options?.exclusive ? { flag: "wx" } : undefined);
    return filePath;
  },
  async read(segments) {
    return readFile(resolveStoragePath(segments));
  },
  async exists(segments) {
    try { return (await stat(resolveStoragePath(segments))).isFile(); } catch { return false; }
  },
  async delete(segments) {
    await rm(resolveStoragePath(segments), { force: true });
  },
  async rename(fromSegments, toSegments) {
    const fromPath = resolveStoragePath(fromSegments);
    const toPath = resolveStoragePath(toSegments);
    await mkdir(path.dirname(toPath), { recursive: true });
    await rename(fromPath, toPath);
  },
};
