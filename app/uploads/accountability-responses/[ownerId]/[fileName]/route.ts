import { readDurableUpload, isSafeStorageId, isSafeUploadedFileName } from "@/lib/storage/durable-upload-storage";
import { storageFileResponse, storageNotFoundResponse } from "@/lib/storage/storage-response";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ ownerId: string; fileName: string }> }) {
  const { ownerId, fileName } = await params;
  if (!isSafeStorageId(ownerId) || !isSafeUploadedFileName(fileName)) return storageNotFoundResponse();
  const file = await readDurableUpload("accountability-responses", ownerId, fileName);
  return file ? storageFileResponse(file, fileName) : storageNotFoundResponse();
}
