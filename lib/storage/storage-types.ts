import "server-only";

export interface StorageProvider {
  write(segments: readonly string[], data: Uint8Array, options?: { exclusive?: boolean }): Promise<string>;
  read(segments: readonly string[]): Promise<Buffer>;
  exists(segments: readonly string[]): Promise<boolean>;
  delete(segments: readonly string[]): Promise<void>;
  resolve(segments: readonly string[]): string;
}
