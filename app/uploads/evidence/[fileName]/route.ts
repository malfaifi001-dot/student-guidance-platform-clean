import { readFile } from "fs/promises";
import { NextResponse } from "next/server";

import {
  getEvidenceMimeType,
  isSafeEvidenceStoredFileName,
  resolveExistingEvidenceFile,
} from "@/lib/evidence/evidence-file-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ fileName: string }> };

function notFound() {
  return new NextResponse("Not Found", {
    status: 404,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(_request: Request, context: Context) {
  const { fileName } = await context.params;
  if (!isSafeEvidenceStoredFileName(fileName)) return notFound();

  const contentType = getEvidenceMimeType(fileName);
  const filePath = await resolveExistingEvidenceFile(fileName);
  if (!contentType || !filePath) return notFound();

  try {
    const file = await readFile(filePath);
    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Content-Length": String(file.byteLength),
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return notFound();
  }
}
