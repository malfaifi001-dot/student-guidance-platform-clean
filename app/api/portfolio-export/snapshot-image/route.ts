import { NextResponse } from "next/server";

import { getEvidenceMimeType, getEvidenceStoredFileNameFromUrl } from "@/lib/evidence/evidence-file-storage";
import { collectPortfolioExportImageUrls, readPortfolioExportToken } from "@/lib/portfolio/portfolio-export-snapshot";
import { readDurableUpload, isSafeStorageId, isSafeUploadedFileName } from "@/lib/storage/durable-upload-storage";
import { readStorageFile } from "@/lib/storage/storage-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const MAX_INPUT_PIXELS = 40_000_000;
const MAX_RASTER_EDGE = 2000;
let activeSharpJobs = 0;
const waitingSharpJobs: Array<() => void> = [];

function notFound() {
  return new NextResponse("Not Found", { status: 404, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

async function withSharpSlot<T>(work: () => Promise<T>) {
  if (activeSharpJobs >= 2) await new Promise<void>((resolve) => waitingSharpJobs.push(resolve));
  activeSharpJobs += 1;
  try { return await work(); } finally {
    activeSharpJobs -= 1;
    waitingSharpJobs.shift()?.();
  }
}

function sourceDetails(source: string) {
  if (source.startsWith("/uploads/portfolio/")) {
    const parts = source.slice("/uploads/portfolio/".length).split("/");
    if (parts.length !== 2 || !isSafeStorageId(parts[0]) || !isSafeUploadedFileName(parts[1])) return null;
    return { kind: "portfolio" as const, ownerId: parts[0], fileName: parts[1], mimeType: "image/webp" };
  }
  const fileName = getEvidenceStoredFileNameFromUrl(source);
  const mimeType = fileName ? getEvidenceMimeType(fileName) : null;
  if (!fileName || !mimeType?.startsWith("image/")) return null;
  return { kind: "evidence" as const, fileName, mimeType };
}

async function readSource(source: string, details: ReturnType<typeof sourceDetails>) {
  if (!details) return null;
  if (details.kind === "portfolio") return readDurableUpload("portfolio", details.ownerId, details.fileName);
  return (await readStorageFile(["evidence", details.fileName])) || null;
}

async function transformImage(input: Buffer, mimeType: string) {
  const sharpModule = await import("sharp");
  const sharp = sharpModule.default;
  const image = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "warning" });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) throw new Error("IMAGE_DIMENSIONS_UNAVAILABLE");
  if (input.byteLength <= 750_000 && Math.max(metadata.width, metadata.height) <= MAX_RASTER_EDGE) {
    return { body: input, mimeType };
  }

  const pipeline = image.rotate().resize({ width: MAX_RASTER_EDGE, height: MAX_RASTER_EDGE, fit: "inside", withoutEnlargement: true });
  if (mimeType === "image/png" || metadata.hasAlpha) {
    return { body: await pipeline.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer(), mimeType: "image/png" };
  }
  if (mimeType === "image/webp") {
    return { body: await pipeline.webp({ quality: 86, effort: 4 }).toBuffer(), mimeType: "image/webp" };
  }
  return { body: await pipeline.jpeg({ quality: 86, mozjpeg: true, progressive: true }).toBuffer(), mimeType: "image/jpeg" };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const source = url.searchParams.get("source") || "";
  const payload = await readPortfolioExportToken(token);
  if (!payload || !source || !collectPortfolioExportImageUrls(payload.document).has(source)) return notFound();

  const details = sourceDetails(source);
  if (!details) return notFound();
  try {
    const original = await readSource(source, details);
    if (!original || original.byteLength > MAX_INPUT_BYTES) return notFound();
    let result: { body: Buffer; mimeType: string };
    try {
      result = await withSharpSlot(() => transformImage(original, details.mimeType));
    } catch (error) {
      console.warn("PORTFOLIO_SNAPSHOT_IMAGE_TRANSFORM_FALLBACK", {
        optimized: false,
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorCode: error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : null,
      });
      result = { body: original, mimeType: details.mimeType };
    }
    return new NextResponse(new Uint8Array(result.body), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Length": String(result.body.byteLength),
        "Content-Type": result.mimeType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return notFound();
  }
}
