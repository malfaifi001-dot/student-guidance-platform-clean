import { NextResponse } from "next/server";

import {
  isSafeSchoolSignatureFileName,
  isSafeSchoolSignatureOwnerId,
  resolveExistingSchoolSignatureFile,
} from "@/lib/settings/school-signature-file-storage";
import { readStorageFile } from "@/lib/storage/storage-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{
    schoolAccountId: string;
    fileName: string;
  }>;
};

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
  const { schoolAccountId, fileName } = await context.params;

  if (
    !isSafeSchoolSignatureOwnerId(schoolAccountId) ||
    !isSafeSchoolSignatureFileName(fileName)
  ) {
    return notFound();
  }

  const filePath = await resolveExistingSchoolSignatureFile(
    schoolAccountId,
    fileName,
  );

  if (!filePath) {
    return notFound();
  }

  try {
    const file = await readStorageFile(["school-signatures", schoolAccountId, fileName]);

    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Content-Length": String(file.byteLength),
        "Content-Type": "image/png",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return notFound();
  }
}
