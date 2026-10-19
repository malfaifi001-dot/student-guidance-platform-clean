import "server-only";

import { randomUUID } from "crypto";

import type { PortfolioPrintData } from "@/components/portfolio/print/portfolio-print-types";
import { getEvidenceStoredFileNameFromUrl } from "@/lib/evidence/evidence-file-storage";
import { isSafeStorageId, isSafeUploadedFileName } from "@/lib/storage/durable-upload-storage";
import { deleteStorageFile, listStorageFiles, readStorageFile, storageFileExists, writeStorageFile } from "@/lib/storage/storage-provider";

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

function storageKey(token: string) {
  if (!TOKEN_PATTERN.test(token)) throw new Error("Invalid portfolio export token.");
  return ["portfolio-export", `${token}.json`];
}

async function cleanupExpiredExports() {
  const now = Date.now();
  const entries = await listStorageFiles(["portfolio-export"]);
  await Promise.all(entries
    .filter((entry) => {
      const token = entry.name.endsWith(".json") ? entry.name.slice(0, -5) : "";
      return TOKEN_PATTERN.test(token) && now - entry.modifiedAtMs > PORTFOLIO_EXPORT_TTL_MS;
    })
    .map((entry) => deleteStorageFile(["portfolio-export", entry.name]).catch(() => undefined)));
}

export async function createPortfolioExportToken(document: PortfolioPrintData) {
  const token = randomUUID();
  await writeStorageFile(
    storageKey(token),
    Buffer.from(JSON.stringify({ createdAt: Date.now(), document }), "utf8"),
    { exclusive: true },
  );
  void cleanupExpiredExports().catch(() => undefined);
  return token;
}

export async function readPortfolioExportToken(token: string) {
  try {
    const payload = JSON.parse((await readStorageFile(storageKey(token))).toString("utf8")) as Partial<PortfolioExportPayload>;
    if (typeof payload.createdAt !== "number" || Date.now() - payload.createdAt > PORTFOLIO_EXPORT_TTL_MS || !payload.document || typeof payload.document !== "object") {
      await deleteStorageFile(storageKey(token)).catch(() => undefined);
      return null;
    }
    return payload as PortfolioExportPayload;
  } catch {
    return null;
  }
}
