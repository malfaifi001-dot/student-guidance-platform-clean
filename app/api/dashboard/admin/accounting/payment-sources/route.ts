import { NextResponse } from "next/server";

import { accountingApiError, requireAccountingApiActor } from "@/lib/admin/accounting/accounting-api";
import { paymentSourceInputSchema } from "@/lib/admin/accounting/accounting-schemas";
import { createPaymentSource } from "@/lib/admin/accounting/accounting-service";

export async function POST(request: Request) {
  const auth = await requireAccountingApiActor();
  if ("error" in auth) return auth.error;
  try {
    const input = paymentSourceInputSchema.parse(await request.json());
    const paymentSource = await createPaymentSource(input, auth.actor);
    return NextResponse.json({ paymentSource, message: "تم إنشاء مصدر الدفع." }, { status: 201 });
  } catch (error) {
    return accountingApiError(error);
  }
}
