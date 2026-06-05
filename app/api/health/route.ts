import { NextRequest, NextResponse } from "next/server";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HealthCheck = {
  name: string;
  ok: boolean;
  message: string;
};

async function checkDatabase(): Promise<HealthCheck> {
  if (!process.env.DATABASE_URL) {
    return {
      name: "database",
      ok: false,
      message: "DATABASE_URL is missing.",
    };
  }

  try {
    await prisma.$queryRaw`SELECT 1`;

    return {
      name: "database",
      ok: true,
      message: "Database connection is working.",
    };
  } catch (error) {
    return {
      name: "database",
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Database connection failed.",
    };
  }
}

async function checkUploads(): Promise<HealthCheck> {
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  const testFile = path.join(uploadDir, ".healthcheck-write-test.txt");

  try {
    await mkdir(uploadDir, { recursive: true });
    await writeFile(testFile, `ok-${Date.now()}`, "utf8");
    await unlink(testFile);

    return {
      name: "uploads",
      ok: true,
      message: "Upload directory is writable.",
    };
  } catch (error) {
    return {
      name: "uploads",
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Upload directory is not writable.",
    };
  }
}

export async function GET(request: NextRequest) {
  const token = process.env.HEALTHCHECK_TOKEN;
  const providedToken = request.nextUrl.searchParams.get("token");

  if (token && providedToken !== token) {
    return NextResponse.json(
      {
        ok: false,
        message: "Healthcheck token is required.",
      },
      { status: 401 }
    );
  }

  const checks = await Promise.all([checkDatabase(), checkUploads()]);
  const ok = checks.every((check: any) => check.ok);

  return NextResponse.json(
    {
      ok,
      app: "student-guidance-platform",
      nodeEnv: process.env.NODE_ENV || "unknown",
      databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: 200 }
  );
}
