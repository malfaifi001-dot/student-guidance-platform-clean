import { readDurableUpload, isSafeStorageId, isSafeUploadedFileName } from "@/lib/storage/durable-upload-storage";
import { storageFileResponse, storageNotFoundResponse } from "@/lib/storage/storage-response";
export const runtime = "nodejs";
type Context = { params: Promise<{ schoolAccountId: string; fileName: string }> };
export async function GET(_request: Request, context: Context) {
  const { schoolAccountId, fileName } = await context.params;
  if (!isSafeStorageId(schoolAccountId) || !isSafeUploadedFileName(fileName) || !/\.(png|jpe?g|webp)$/i.test(fileName)) return storageNotFoundResponse();
  const file = await readDurableUpload("school-logos", schoolAccountId, fileName);
  return file ? storageFileResponse(file, fileName) : storageNotFoundResponse();
}
