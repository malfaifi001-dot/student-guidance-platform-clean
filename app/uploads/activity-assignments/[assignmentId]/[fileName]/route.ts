import { readDurableUpload, isSafeStorageId, isSafeUploadedFileName } from "@/lib/storage/durable-upload-storage";
import { storageFileResponse, storageNotFoundResponse } from "@/lib/storage/storage-response";
export const runtime = "nodejs";
type Context = { params: Promise<{ assignmentId: string; fileName: string }> };
export async function GET(_request: Request, context: Context) {
  const { assignmentId, fileName } = await context.params;
  if (!isSafeStorageId(assignmentId) || !isSafeUploadedFileName(fileName)) return storageNotFoundResponse();
  const file = await readDurableUpload("activity-assignments", assignmentId, fileName);
  return file ? storageFileResponse(file, fileName) : storageNotFoundResponse();
}
