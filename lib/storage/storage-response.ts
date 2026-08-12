import "server-only";

import path from "node:path";
import { NextResponse } from "next/server";

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".pdf": "application/pdf", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel", ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function storageNotFoundResponse() {
  return new NextResponse("Not Found", { status: 404, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" } });
}

export function storageFileResponse(file: Uint8Array, fileName: string, contentType?: string) {
  return new NextResponse(new Uint8Array(file), { headers: {
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Disposition": `inline; filename="${fileName.replace(/["\r\n]/g, "")}"`,
    "Content-Length": String(file.byteLength),
    "Content-Type": contentType || CONTENT_TYPES[path.extname(fileName).toLowerCase()] || "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
  } });
}
