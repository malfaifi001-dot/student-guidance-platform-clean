import { NextResponse } from "next/server";

import { accountingApiError, requireAccountingApiActor } from "@/lib/admin/accounting/accounting-api";
import { markExpensePaidSchema } from "@/lib/admin/accounting/accounting-schemas";
import { markExpensePaid } from "@/lib/admin/accounting/accounting-service";

type Context = { params: Promise<{ expenseId: string }> };

export async function POST(request: Request, context: Context) {
  const auth = await requireAccountingApiActor();
  if ("error" in auth) return auth.error;
  try {
    const { expenseId } = await context.params;
    const input = markExpensePaidSchema.parse(await request.json());
    await markExpensePaid(expenseId, input, auth.actor, auth.request);
    return NextResponse.json({ message: "تم تسجيل سداد المصروف وحفظ مصدر الدفع." });
  } catch (error) {
    return accountingApiError(error);
  }
}
