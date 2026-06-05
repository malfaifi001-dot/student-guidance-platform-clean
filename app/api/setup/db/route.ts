import { execFile } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { promisify } from "util";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);

type Attempt = {
  command: string;
  args: string[];
  exists?: boolean;
  success: boolean;
  errorMessage?: string;
  stdout?: string;
  stderr?: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!process.env.ADMIN_SETUP_TOKEN || token !== process.env.ADMIN_SETUP_TOKEN) {
    return NextResponse.json(
      { success: false, message: "غير مصرح." },
      { status: 401 }
    );
  }

  const localPrisma =
    process.platform === "win32"
      ? path.join(process.cwd(), "node_modules", ".bin", "prisma.cmd")
      : path.join(process.cwd(), "node_modules", ".bin", "prisma");

  const candidates = [
    {
      command: localPrisma,
      args: ["db", "push", "--skip-generate"],
      exists: existsSync(localPrisma),
    },
    {
      command: process.platform === "win32" ? "npx.cmd" : "npx",
      args: ["prisma", "db", "push", "--skip-generate"],
      exists: undefined,
    },
  ];

  const attempts: Attempt[] = [];

  for (const candidate of candidates) {
    try {
      const result = await execFileAsync(candidate.command, candidate.args, {
        cwd: process.cwd(),
        env: process.env,
        timeout: 120000,
        maxBuffer: 1024 * 1024 * 2,
      });

      attempts.push({
        command: candidate.command,
        args: candidate.args,
        exists: candidate.exists,
        success: true,
        stdout: result.stdout,
        stderr: result.stderr,
      });

      return NextResponse.json({
        success: true,
        message: "تم تنفيذ prisma db push داخل بيئة التشغيل.",
        cwd: process.cwd(),
        attempts,
      });
    } catch (error) {
      attempts.push({
        command: candidate.command,
        args: candidate.args,
        exists: candidate.exists,
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json(
    {
      success: false,
      message: "فشل تنفيذ prisma db push بكل الطرق.",
      cwd: process.cwd(),
      attempts,
    },
    { status: 500 }
  );
}
