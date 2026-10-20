import "server-only";

import { createReadStream } from "node:fs";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveStoragePath } from "./storage-paths";
import type { StorageFileEntry, StorageProvider } from "./storage-types";

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
  async stat(segments) {
    const details = await stat(resolveStoragePath(segments));
    if (!details.isFile()) throw new Error("STORAGE_FILE_NOT_FOUND");
    return { size: details.size, modifiedAtMs: details.mtimeMs };
  },
  createReadStream(segments, options) {
    return createReadStream(resolveStoragePath(segments), options);
  },
  async exists(segments) {
    try { return (await stat(resolveStoragePath(segments))).isFile(); } catch { return false; }
  },
  async list(segments): Promise<readonly StorageFileEntry[]> {
    try {
      const directory = resolveStoragePath(segments);
      const entries = await readdir(directory, { withFileTypes: true });
      return (await Promise.all(entries.filter((entry) => entry.isFile()).map(async (entry) => {
        try {
          const details = await stat(path.join(directory, entry.name));
          return { name: entry.name, modifiedAtMs: details.mtimeMs };
        } catch {
          return null;
        }
      }))).filter((entry): entry is StorageFileEntry => entry !== null);
    } catch {
      return [];
    }
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
