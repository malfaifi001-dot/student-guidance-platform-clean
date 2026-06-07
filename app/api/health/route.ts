import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Check = {
  name: string;
  ok: boolean;
  message: string;
  value?: number;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function runCheck(name: string, fn: () => Promise<number | void>): Promise<Check> {
  try {
    const value = await fn();

    return {
      name,
      ok: true,
      message: "OK",
      value: typeof value === "number" ? value : undefined,
    };
  } catch (error) {
    return {
      name,
      ok: false,
      message: errorMessage(error),
    };
  }
}

export async function GET() {
  const checks = await Promise.all([
    runCheck("database-select-1", async () => {
      await prisma.$queryRaw`SELECT 1`;
    }),

    runCheck("table-user-count", async () => {
      return prisma.user.count();
    }),

    runCheck("table-school-account-count", async () => {
      return prisma.schoolAccount.count();
    }),

    runCheck("table-user-session-count", async () => {
      return prisma.userSession.count();
    }),
  ]);

  return NextResponse.json(
    {
      ok: checks.every((check) => check.ok),
      app: "student-guidance-platform",
      nodeEnv: process.env.NODE_ENV || "unknown",
      databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: 200 }
  );
}
