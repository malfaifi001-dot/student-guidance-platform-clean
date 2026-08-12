import { readDurableUpload, isSafeStorageId, isSafeUploadedFileName } from "@/lib/storage/durable-upload-storage";
import { storageFileResponse, storageNotFoundResponse } from "@/lib/storage/storage-response";
export const runtime = "nodejs";
type Context = { params: Promise<{ portfolioId: string; fileName: string }> };
export async function GET(_request: Request, context: Context) {
  const { portfolioId, fileName } = await context.params;
  if (!isSafeStorageId(portfolioId) || !isSafeUploadedFileName(fileName) || !fileName.toLowerCase().endsWith(".webp")) return storageNotFoundResponse();
  const file = await readDurableUpload("portfolio", portfolioId, fileName);
  return file ? storageFileResponse(file, fileName, "image/webp") : storageNotFoundResponse();
}
