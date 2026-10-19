import "server-only";

import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

import type { PortfolioPrintData } from "@/components/portfolio/print/portfolio-print-types";
import { getEvidenceStoredFileNameFromUrl } from "@/lib/evidence/evidence-file-storage";
import { isSafeStorageId, isSafeUploadedFileName } from "@/lib/storage/durable-upload-storage";
import { storageFileExists } from "@/lib/storage/storage-provider";

const PORTFOLIO_EXPORT_TTL_MS = 10 * 60 * 1000;
const TOKEN_PATTERN = /^[a-f0-9-]{36}$/i;

type PortfolioExportPayload = {
  createdAt: number;
  document: PortfolioPrintData;
};

const LOCAL_IMAGE_PREFIXES = ["/uploads/portfolio/", "/uploads/evidence/"] as const;

function isLocalImageUrl(value: string) {
  const pathname = value.split(/[?#]/, 1)[0] || "";
  return LOCAL_IMAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix)) && /\.(?:jpe?g|png|webp)$/i.test(pathname);
}

export function collectPortfolioExportImageUrls(document: PortfolioPrintData) {
  const urls = new Set<string>();
  const visit = (value: unknown) => {
    if (typeof value === "string") {
      if (isLocalImageUrl(value)) urls.add(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(document);
  return urls;
}

export async function assertPortfolioExportImageSourcesAvailable(document: PortfolioPrintData) {
  const sources = collectPortfolioExportImageUrls(document);
  for (const source of sources) {
    if (source.startsWith("/uploads/portfolio/")) {
      const parts = source.slice("/uploads/portfolio/".length).split("/");
      if (parts.length !== 2 || !isSafeStorageId(parts[0]) || !isSafeUploadedFileName(parts[1]) || !(await storageFileExists(["portfolio", parts[0], parts[1]]))) throw new Error("PORTFOLIO_EXPORT_IMAGE_MISSING");
      continue;
    }
    const fileName = getEvidenceStoredFileNameFromUrl(source);
    if (!fileName || !(await storageFileExists(["evidence", fileName]))) throw new Error("PORTFOLIO_EXPORT_IMAGE_MISSING");
  }
}

export function buildPortfolioExportImageUrl(token: string, source: string) {
  return `/api/portfolio-export/snapshot-image?token=${encodeURIComponent(token)}&source=${encodeURIComponent(source)}`;
}

export function preparePortfolioDocumentForPdf(document: PortfolioPrintData, token: string) {
  const replace = (value: unknown): unknown => {
    if (typeof value === "string") return isLocalImageUrl(value) ? buildPortfolioExportImageUrl(token, value) : value;
    if (Array.isArray(value)) return value.map(replace);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replace(item)]));
    return value;
  };
  return replace(document) as PortfolioPrintData;
}

function storageDirectory() {
  return path.join(process.cwd(), ".tmp", "portfolio-export");
}

function storagePath(token: string) {
  if (!TOKEN_PATTERN.test(token)) throw new Error("Invalid portfolio export token.");
  return path.join(storageDirectory(), `${token}.json`);
}

async function cleanupExpiredExports() {
  const directory = storageDirectory();
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const now = Date.now();
    await Promise.all(entries.filter((entry) => entry.isFile() && TOKEN_PATTERN.test(path.parse(entry.name).name)).map(async (entry) => {
      const filePath = path.join(directory, entry.name);
      try {
        if (now - (await fs.stat(filePath)).mtimeMs > PORTFOLIO_EXPORT_TTL_MS) await fs.unlink(filePath);
      } catch {
        // The file may have been removed by another cleanup.
      }
    }));
  } catch {
    // The directory is created on the first export.
  }
}

export async function createPortfolioExportToken(document: PortfolioPrintData) {
  const token = randomUUID();
  await fs.mkdir(storageDirectory(), { recursive: true });
  await fs.writeFile(storagePath(token), JSON.stringify({ createdAt: Date.now(), document }), { encoding: "utf8", flag: "wx" });
  void cleanupExpiredExports();
  return token;
}

export async function readPortfolioExportToken(token: string) {
  try {
    const filePath = storagePath(token);
    const payload = JSON.parse(await fs.readFile(filePath, "utf8")) as Partial<PortfolioExportPayload>;
    if (typeof payload.createdAt !== "number" || Date.now() - payload.createdAt > PORTFOLIO_EXPORT_TTL_MS || !payload.document || typeof payload.document !== "object") {
      await fs.unlink(filePath).catch(() => undefined);
      return null;
    }
    return payload as PortfolioExportPayload;
  } catch {
    return null;
  }
}
