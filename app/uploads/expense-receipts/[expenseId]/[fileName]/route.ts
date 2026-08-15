import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { prisma } from "@/lib/prisma";
import { isSafeStorageId, isSafeUploadedFileName, readDurableUpload } from "@/lib/storage/durable-upload-storage";
import { storageFileResponse, storageNotFoundResponse } from "@/lib/storage/storage-response";

export const runtime = "nodejs";
type Context = { params: Promise<{ expenseId: string; fileName: string }> };

export async function GET(_request: Request, context: Context) {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;
  const { expenseId, fileName } = await context.params;
  if (!isSafeStorageId(expenseId) || !isSafeUploadedFileName(fileName)) {
    return storageNotFoundResponse();
  }
  const attachment = await prisma.expenseAttachment.findFirst({
    where: { expenseId, storedFileName: fileName, isArchived: false },
    select: { mimeType: true, originalFileName: true },
  });
  if (!attachment) return storageNotFoundResponse();
  const file = await readDurableUpload("expense-receipts", expenseId, fileName);
  if (!file) return storageNotFoundResponse();
  const response = storageFileResponse(file, fileName, attachment.mimeType);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
