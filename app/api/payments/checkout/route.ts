import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import {
  createCheckoutPaymentTransaction,
  ElectronicPaymentError,
} from "@/lib/payments/electronic-payments";

export async function POST(request: NextRequest) {
  const current = await getCurrentSessionUser();

  if (!current?.user) {
    return NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 });
  }

  if (!current.user.schoolAccountId) {
    return NextResponse.json(
      { error: "لا يوجد حساب مدرسة مرتبط بالمستخدم الحالي." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));

  try {
    const result = await createCheckoutPaymentTransaction({
      requesterUserId: current.user.id,
      schoolAccountId: current.user.schoolAccountId,
      planId: String(body?.planId || ""),
      billingCycle:
        String(body?.billingCycle || "MONTHLY").toUpperCase() === "YEARLY"
          ? "YEARLY"
          : "MONTHLY",
      providerSlug: String(body?.providerSlug || ""),
    });

    return NextResponse.json({
      transaction: result.transaction,
      checkoutUrl: result.checkoutUrl,
    });
  } catch (error) {
    if (error instanceof ElectronicPaymentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("checkout payment failed", error);
    return NextResponse.json(
      { error: "تعذر إنشاء عملية الدفع." },
      { status: 500 }
    );
  }
}