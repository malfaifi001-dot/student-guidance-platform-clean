import { NextResponse } from "next/server";

import { accountingApiError, requireAccountingApiActor } from "@/lib/admin/accounting/accounting-api";
import { activateNextExpenseCycle } from "@/lib/admin/accounting/accounting-service";

type Context = { params: Promise<{ expenseId: string }> };

export async function POST(_request: Request, context: Context) {
  const auth = await requireAccountingApiActor();
  if ("error" in auth) return auth.error;
  try {
    const { expenseId } = await context.params;
    await activateNextExpenseCycle(expenseId, auth.actor, auth.request);
    return NextResponse.json({ message: "تم بدء دورة الاستحقاق التالية مع حفظ سجل الدفعات السابقة." });
  } catch (error) {
    return accountingApiError(error);
  }
}
