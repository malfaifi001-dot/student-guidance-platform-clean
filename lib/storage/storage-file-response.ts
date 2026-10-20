import "server-only";

import { Readable } from "node:stream";

import { storageProvider } from "@/lib/storage/storage-provider";
import { parseByteRange } from "@/lib/storage/http-range";

export type StoredFileResponseOptions = {
  request: Request;
  segments: readonly string[];
  fileName: string;
  etag: string;
  contentType: string;
};

function quoteEtag(value: string) {
  return `"${value.replace(/["\\]/g, "")}"`;
}

function ifRangeAllowsRange(request: Request, etag: string, modifiedAtMs: number) {
  const ifRange = request.headers.get("if-range")?.trim();
  if (!ifRange) return true;
  if (ifRange === quoteEtag(etag) || ifRange === etag) return true;
  const date = Date.parse(ifRange);
  return Number.isFinite(date) && Math.floor(modifiedAtMs / 1000) <= Math.floor(date / 1000);
}

function contentDisposition(fileName: string) {
  const safeName = fileName.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim() || "portfolio.pdf";
  return `attachment; filename="portfolio.pdf"; filename*=UTF-8''${encodeURIComponent(safeName)}`;
}

function commonHeaders(options: StoredFileResponseOptions, size: number, etag: string, modifiedAtMs: number) {
  return new Headers({
    "Content-Type": options.contentType,
    "Content-Disposition": contentDisposition(options.fileName),
    "Cache-Control": "private, no-store",
    "Accept-Ranges": "bytes",
    "ETag": quoteEtag(etag),
    "Last-Modified": new Date(modifiedAtMs).toUTCString(),
    "Content-Length": String(size),
  });
}

export async function createStoredFileResponse(options: StoredFileResponseOptions) {
  const details = await storageProvider.stat(options.segments);
  const etag = options.etag;
  const headers = commonHeaders(options, details.size, etag, details.modifiedAtMs);
  const range = ifRangeAllowsRange(options.request, etag, details.modifiedAtMs)
    ? parseByteRange(options.request.headers.get("range"), details.size)
    : null;

  if (range === "invalid") {
    headers.set("Content-Range", `bytes */${details.size}`);
    return new Response(null, { status: 416, headers });
  }

  const isHead = options.request.method.toUpperCase() === "HEAD";
  if (range) {
    const length = range.end - range.start + 1;
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${details.size}`);
    headers.set("Content-Length", String(length));
    return new Response(
      isHead ? null : Readable.toWeb(storageProvider.createReadStream(options.segments, range)) as ReadableStream<Uint8Array>,
      { status: 206, headers },
    );
  }

  return new Response(
    isHead ? null : Readable.toWeb(storageProvider.createReadStream(options.segments)) as ReadableStream<Uint8Array>,
    { status: 200, headers },
  );
}
