import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { accountingApiError, requireAccountingApiActor } from "@/lib/admin/accounting/accounting-api";
import { addExpenseAttachment } from "@/lib/admin/accounting/accounting-service";
import {
  EXPENSE_RECEIPT_MAX_BYTES,
  EXPENSE_RECEIPT_MIME_EXTENSIONS,
  hasValidExpenseReceiptSignature,
  validateExpenseReceipt,
  type ExpenseReceiptMimeType,
} from "@/lib/admin/accounting/expense-receipt-upload";
import { prisma } from "@/lib/prisma";
import { writeDurableUpload } from "@/lib/storage/durable-upload-storage";

export const runtime = "nodejs";
type Context = { params: Promise<{ expenseId: string }> };

export async function POST(request: Request, context: Context) {
  const auth = await requireAccountingApiActor();
  if ("error" in auth) return auth.error;
  try {
    const { expenseId } = await context.params;
    const exists = await prisma.operationalExpense.findFirst({
      where: { id: expenseId, archivedAt: null },
      select: { id: true },
    });
    if (!exists) return NextResponse.json({ error: "المصروف غير موجود." }, { status: 404 });
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > EXPENSE_RECEIPT_MAX_BYTES + 1024 * 1024) {
      return NextResponse.json({ error: "حجم طلب الرفع أكبر من الحد المسموح." }, { status: 413 });
    }
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "اختر إيصالًا أو مرفقًا." }, { status: 400 });
    }
    const validationError = validateExpenseReceipt(file);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
    const mimeType = file.type as ExpenseReceiptMimeType;
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasValidExpenseReceiptSignature(buffer, mimeType)) {
      return NextResponse.json({ error: "محتوى الملف لا يطابق صيغته المعلنة." }, { status: 400 });
    }
    const storedFileName = `${randomUUID()}.${EXPENSE_RECEIPT_MIME_EXTENSIONS[mimeType]}`;
    const fileUrl = await writeDurableUpload(
      "expense-receipts",
      expenseId,
      storedFileName,
      new Uint8Array(buffer),
    );
    const attachment = await addExpenseAttachment(
      {
        expenseId,
        originalFileName: file.name.slice(0, 190),
        storedFileName,
        mimeType,
        sizeBytes: file.size,
        fileUrl,
      },
      auth.actor,
      auth.request,
    );
    return NextResponse.json({ attachment, message: "تم رفع المرفق." }, { status: 201 });
  } catch (error) {
    return accountingApiError(error);
  }
}
