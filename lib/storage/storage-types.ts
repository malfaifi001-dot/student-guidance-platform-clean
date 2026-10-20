import "server-only";

export type StorageFileEntry = {
  name: string;
  modifiedAtMs: number;
};

export interface StorageProvider {
  write(segments: readonly string[], data: Uint8Array, options?: { exclusive?: boolean }): Promise<string>;
  read(segments: readonly string[]): Promise<Buffer>;
  exists(segments: readonly string[]): Promise<boolean>;
  list(segments: readonly string[]): Promise<readonly StorageFileEntry[]>;
  delete(segments: readonly string[]): Promise<void>;
  rename(fromSegments: readonly string[], toSegments: readonly string[]): Promise<void>;
  resolve(segments: readonly string[]): string;
}
