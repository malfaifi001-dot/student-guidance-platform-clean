import { readDurableUpload, isSafeStorageId, isSafeUploadedFileName } from "@/lib/storage/durable-upload-storage";
import { storageFileResponse, storageNotFoundResponse } from "@/lib/storage/storage-response";
export const runtime = "nodejs";
type Context = { params: Promise<{ userId: string; fileName: string }> };
export async function GET(_request: Request, context: Context) {
  const { userId, fileName } = await context.params;
  if (!isSafeStorageId(userId) || !isSafeUploadedFileName(fileName) || !fileName.toLowerCase().endsWith(".png")) return storageNotFoundResponse();
  const file = await readDurableUpload("user-signatures", userId, fileName);
  return file ? storageFileResponse(file, fileName, "image/png") : storageNotFoundResponse();
}
