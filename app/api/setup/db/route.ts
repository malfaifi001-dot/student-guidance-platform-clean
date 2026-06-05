import { execFile } from "child_process";
import { promisify } from "util";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!process.env.ADMIN_SETUP_TOKEN || token !== process.env.ADMIN_SETUP_TOKEN) {
    return NextResponse.json(
      {
        success: false,
        message: "غير مصرح.",
      },
      { status: 401 }
    );
  }

  try {
    const command = process.platform === "win32" ? "npx.cmd" : "npx";

    const result = await execFileAsync(
      command,
      ["prisma", "db", "push", "--skip-generate"],
      {
        cwd: process.cwd(),
        env: process.env,
        timeout: 120000,
        maxBuffer: 1024 * 1024 * 2,
      }
    );

    return NextResponse.json({
      success: true,
      message: "تم تنفيذ prisma db push داخل بيئة التشغيل.",
      stdout: result.stdout,
      stderr: result.stderr,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "فشل تنفيذ prisma db push داخل بيئة التشغيل.",
        errorName: error instanceof Error ? error.name : "UNKNOWN_ERROR",
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
