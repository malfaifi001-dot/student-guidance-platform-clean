import { NextResponse } from "next/server";

import { accountingApiError, requireAccountingApiActor } from "@/lib/admin/accounting/accounting-api";
import { archiveExpenseAttachment } from "@/lib/admin/accounting/accounting-service";

type Context = { params: Promise<{ expenseId: string; attachmentId: string }> };

export async function DELETE(_request: Request, context: Context) {
  const auth = await requireAccountingApiActor();
  if ("error" in auth) return auth.error;
  try {
    const { expenseId, attachmentId } = await context.params;
    await archiveExpenseAttachment(expenseId, attachmentId, auth.actor, auth.request);
    return NextResponse.json({ message: "تمت أرشفة المرفق مع حفظ سجل العملية." });
  } catch (error) {
    return accountingApiError(error);
  }
}
