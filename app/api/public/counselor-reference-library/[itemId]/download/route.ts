import { NextResponse } from "next/server";
import { getAnonymousReferenceLibraryItem } from "@/lib/reference-library/reference-library-anonymous-service";
import { readReferenceLibraryFile, referenceLibraryFileExists } from "@/lib/reference-library/reference-library-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseVariant(value: string | null) {
  const variant = String(value || "pdf").toLowerCase();
  return variant === "pdf" || variant === "docx" ? variant : null;
}

function contentDisposition(mode: "inline" | "attachment", fileName: string) {
  const safeName = fileName.replace(/[\r\n"\\/]/g, "-").trim().slice(0, 180) || "reference-file";
  return `${mode}; filename*=UTF-8''${encodeURIComponent(safeName)}`;
}

export async function GET(request: Request, context: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await context.params;
  const item = await getAnonymousReferenceLibraryItem(itemId);
  if (!item || item.itemType !== "FILE" || !("pdfStorageKey" in item)) return NextResponse.json({ success: false, error: "الملف غير متاح." }, { status: 404 });

  const url = new URL(request.url);
  const variant = parseVariant(url.searchParams.get("variant"));
  const download = url.searchParams.get("download") === "1";
  if (!variant) return NextResponse.json({ success: false, error: "نوع الملف غير صالح." }, { status: 400 });
  if (download && !item.allowDownload) return NextResponse.json({ success: false, error: "تحميل هذا الملف غير متاح." }, { status: 403 });
  if (variant === "docx" && !download) return NextResponse.json({ success: false, error: "ملفات Word متاحة للتحميل فقط." }, { status: 400 });

  const fileItem = item as typeof item & {
    pdfStorageKey: string | null;
    pdfMimeType: string | null;
    pdfFileName: string | null;
    pdfSizeBytes: number | null;
    docxStorageKey: string | null;
    docxMimeType: string | null;
    docxFileName: string | null;
    docxSizeBytes: number | null;
  };
  const selected = variant === "pdf"
    ? { storageKey: fileItem.pdfStorageKey, mimeType: fileItem.pdfMimeType || "application/pdf", fileName: fileItem.pdfFileName || `${fileItem.title}.pdf`, sizeBytes: fileItem.pdfSizeBytes }
    : { storageKey: fileItem.docxStorageKey, mimeType: fileItem.docxMimeType || "application/vnd.openxmlformats-officedocument.wordprocessingml.document", fileName: fileItem.docxFileName || `${fileItem.title}.docx`, sizeBytes: fileItem.docxSizeBytes };

  if (!selected.storageKey || !(await referenceLibraryFileExists(selected.storageKey))) return NextResponse.json({ success: false, error: "الملف غير موجود." }, { status: 404 });
  const buffer = await readReferenceLibraryFile(selected.storageKey);
  const headers = new Headers({
    "Content-Type": selected.mimeType,
    "Content-Disposition": contentDisposition(download ? "attachment" : "inline", selected.fileName),
    "Content-Length": String(buffer.length),
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "public, max-age=300, s-maxage=3600",
  });
  if (variant === "pdf") headers.set("Accept-Ranges", "bytes");
  return new Response(buffer, { status: 200, headers });
}
