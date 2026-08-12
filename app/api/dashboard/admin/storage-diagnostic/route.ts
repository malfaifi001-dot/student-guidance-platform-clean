import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";

export const runtime = "nodejs";

const PROBE_CONTENT = "teachix-runtime-storage-ok";
const PROBE_FILE_NAME = "runtime-probe.txt";

export async function GET() {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;

  const storageRoot = process.env.TEACHIX_STORAGE_ROOT?.trim();

  if (!storageRoot) {
    return NextResponse.json({
      success: false,
      storageRootConfigured: false,
      writable: false,
    });
  }

  const resolvedProbeDirectory = path.resolve(storageRoot, "_runtime-probe");
  const probeFilePath = path.join(resolvedProbeDirectory, PROBE_FILE_NAME);

  try {
    await fs.mkdir(resolvedProbeDirectory, { recursive: true });
    await fs.writeFile(probeFilePath, PROBE_CONTENT, "utf8");
    const storedContent = await fs.readFile(probeFilePath, "utf8");
    const contentMatches = storedContent === PROBE_CONTENT;

    return NextResponse.json({
      success: contentMatches,
      storageRootConfigured: true,
      writable: true,
      readable: true,
      contentMatches,
      resolvedProbeDirectory,
    });
  } catch {
    return NextResponse.json({
      success: false,
      storageRootConfigured: true,
      writable: false,
      readable: false,
      contentMatches: false,
      resolvedProbeDirectory,
    });
  }
}
