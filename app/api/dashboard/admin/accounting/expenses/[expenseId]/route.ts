import { NextResponse } from "next/server";

import { accountingApiError, requireAccountingApiActor } from "@/lib/admin/accounting/accounting-api";
import { expenseInputSchema } from "@/lib/admin/accounting/accounting-schemas";
import { cancelExpense, updateExpense } from "@/lib/admin/accounting/accounting-service";

type Context = { params: Promise<{ expenseId: string }> };

export async function PATCH(request: Request, context: Context) {
  const auth = await requireAccountingApiActor();
  if ("error" in auth) return auth.error;
  try {
    const { expenseId } = await context.params;
    const body = await request.json();
    if (body?.action === "cancel") {
      await cancelExpense(expenseId, auth.actor, auth.request);
      return NextResponse.json({ message: "تم إلغاء المصروف مع الاحتفاظ بسجله." });
    }
    const input = expenseInputSchema.parse(body);
    await updateExpense(expenseId, input, auth.actor, auth.request);
    return NextResponse.json({ message: "تم تحديث المصروف." });
  } catch (error) {
    return accountingApiError(error);
  }
}
