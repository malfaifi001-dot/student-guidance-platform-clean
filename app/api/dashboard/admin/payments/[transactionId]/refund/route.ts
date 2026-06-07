import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser, getRequestDeviceInfo } from "@/lib/auth/current-user";
import {
  AdminPaymentOperationError,
  refundPaymentTransaction,
} from "@/lib/payments/admin-payment-operations";

type RouteContext = {
  params: Promise<{
    transactionId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const current = await getCurrentSessionUser();

  if (!current?.user) {
    return NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 });
  }

  const device = await getRequestDeviceInfo();
  const { transactionId } = await context.params;
  const body = await request.json().catch(() => ({}));

  try {
    const result = await refundPaymentTransaction({
      transactionId,
      actorUserId: current.user.id,
      reason: String(body?.reason || "").trim(),
      ipAddress: device.ipAddress,
      userAgent: device.userAgent,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminPaymentOperationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("refund payment transaction failed", error);
    return NextResponse.json(
      { error: "تعذر استرداد عملية الدفع." },
      { status: 500 }
    );
  }
}