import "server-only";

import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

import type { PortfolioPrintData } from "@/components/portfolio/print/portfolio-print-types";

const PORTFOLIO_EXPORT_TTL_MS = 10 * 60 * 1000;
const TOKEN_PATTERN = /^[a-f0-9-]{36}$/i;

type PortfolioExportPayload = {
  createdAt: number;
  document: PortfolioPrintData;
};

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
