import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import {
  CouponValidationError,
  getCouponQuote,
} from "@/lib/promotions/coupon-service";

export async function POST(request: Request) {
  const current = await getCurrentSessionUser();
  if (!current?.user) {
    return NextResponse.json({ error: "يجب تسجيل الدخول أولًا." }, { status: 401 });
  }
  if (!current.user.schoolAccountId) {
    return NextResponse.json({ error: "لا يوجد حساب مدرسة مرتبط." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const planId = String(body?.planId || "").trim();
  const billingCycle =
    String(body?.billingCycle || "MONTHLY").toUpperCase() === "YEARLY"
      ? "YEARLY"
      : "MONTHLY";

  try {
    const quote = await getCouponQuote({
      code: String(body?.couponCode || ""),
      planId,
      billingCycle,
      schoolAccountId: current.user.schoolAccountId,
    });
    return NextResponse.json({ quote });
  } catch (error) {
    if (error instanceof CouponValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    console.error("coupon quote failed", error);
    return NextResponse.json({ error: "تعذر التحقق من الكوبون." }, { status: 500 });
  }
}

