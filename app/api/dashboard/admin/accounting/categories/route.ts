import { NextResponse } from "next/server";

import { accountingApiError, requireAccountingApiActor } from "@/lib/admin/accounting/accounting-api";
import { expenseCategoryInputSchema } from "@/lib/admin/accounting/accounting-schemas";
import { createExpenseCategory } from "@/lib/admin/accounting/accounting-service";

export async function POST(request: Request) {
  const auth = await requireAccountingApiActor();
  if ("error" in auth) return auth.error;
  try {
    const input = expenseCategoryInputSchema.parse(await request.json());
    const category = await createExpenseCategory(input.name, auth.actor);
    return NextResponse.json({ category, message: "تم إنشاء التصنيف." }, { status: 201 });
  } catch (error) {
    return accountingApiError(error);
  }
}
