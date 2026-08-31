import crypto from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";
import { getAccountabilityRespondentView } from "@/lib/accountability/accountability-request-service";
import { getAccountabilityStorageOwnerId, isValidAccountabilityToken } from "@/lib/accountability/accountability-token";
import { writeDurableUpload } from "@/lib/storage/durable-upload-storage";
import { validateEvidenceFile } from "@/lib/evidence/save-evidence-files";

export const runtime = "nodejs";

function sanitizeDisplayFileName(fileName: string) {
  return path
    .basename(fileName)
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180) || "attachment";
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isValidAccountabilityToken(token)) return NextResponse.json({ success: false, error: "الرابط غير صالح." }, { status: 404 });
  const view = await getAccountabilityRespondentView(token);
  if (!view?.workflow || !["SENT", "OPENED", "NEEDS_COMPLETION"].includes(view.request.status)) return NextResponse.json({ success: false, error: "لا يمكن رفع ملف لهذا الطلب." }, { status: 409 });
  const files = (await request.formData()).getAll("file").filter((item): item is File => item instanceof File);
  if (files.length !== 1) return NextResponse.json({ success: false, error: "اختر ملفًا واحدًا." }, { status: 400 });
  const validationError = validateEvidenceFile(files[0]);
  if (validationError) return NextResponse.json({ success: false, error: validationError }, { status: 400 });
  const extension = path.extname(files[0].name).toLowerCase().replace(".", "") || "bin";
  const storedName = `${crypto.randomUUID()}.${extension}`;
  const ownerId = getAccountabilityStorageOwnerId(token);
  const url = await writeDurableUpload("accountability-responses", ownerId, storedName, new Uint8Array(await files[0].arrayBuffer()));
  return NextResponse.json({ success: true, item: { fileName: sanitizeDisplayFileName(files[0].name), fileUrl: url, mimeType: files[0].type, size: files[0].size } });
}
