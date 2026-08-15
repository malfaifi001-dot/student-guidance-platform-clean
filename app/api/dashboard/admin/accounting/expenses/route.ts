import { NextResponse } from "next/server";

import { accountingApiError, requireAccountingApiActor } from "@/lib/admin/accounting/accounting-api";
import { expenseFilterSchema, expenseInputSchema } from "@/lib/admin/accounting/accounting-schemas";
import { createExpense, getAccountingDashboardData } from "@/lib/admin/accounting/accounting-service";

export async function GET(request: Request) {
  const auth = await requireAccountingApiActor();
  if ("error" in auth) return auth.error;
  try {
    const query = new URL(request.url).searchParams;
    const filters = expenseFilterSchema.parse(Object.fromEntries(query.entries()));
    return NextResponse.json(await getAccountingDashboardData(filters));
  } catch (error) {
    return accountingApiError(error);
  }
}

export async function POST(request: Request) {
  const auth = await requireAccountingApiActor();
  if ("error" in auth) return auth.error;
  try {
    const input = expenseInputSchema.parse(await request.json());
    const expense = await createExpense(input, auth.actor, auth.request);
    return NextResponse.json({ expense, message: "تم إنشاء المصروف." }, { status: 201 });
  } catch (error) {
    return accountingApiError(error);
  }
}
