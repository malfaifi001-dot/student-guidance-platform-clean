import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function ensureSearchParam(url: URL, key: string, value: string) {
  if (!url.searchParams.has(key)) {
    url.searchParams.set(key, value);
  }
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not defined");
  }

  const url = new URL(databaseUrl);

  ensureSearchParam(url, "connectionLimit", process.env.PRISMA_CONNECTION_LIMIT || "2");
  ensureSearchParam(url, "acquireTimeout", process.env.PRISMA_POOL_TIMEOUT_MS || "30000");
  ensureSearchParam(url, "connectTimeout", process.env.PRISMA_CONNECT_TIMEOUT_MS || "15000");
  ensureSearchParam(url, "prepareCacheLength", "0");

  const adapter = new PrismaMariaDb(url.toString());

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
