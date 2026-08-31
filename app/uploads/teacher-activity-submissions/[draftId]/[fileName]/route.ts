import {
  isSafeStorageId,
  isSafeUploadedFileName,
  readDurableUpload,
} from "@/lib/storage/durable-upload-storage";
import {
  storageFileResponse,
  storageNotFoundResponse,
} from "@/lib/storage/storage-response";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    draftId: string;
    fileName: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { draftId, fileName } = await context.params;

  if (!isSafeStorageId(draftId) || !isSafeUploadedFileName(fileName)) {
    return storageNotFoundResponse();
  }

  const file = await readDurableUpload(
    "teacher-activity-submissions",
    draftId,
    fileName,
  );

  return file
    ? storageFileResponse(file, fileName)
    : storageNotFoundResponse();
}
