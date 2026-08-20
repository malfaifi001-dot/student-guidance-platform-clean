import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import {
  getCurrentSessionUser,
  getRequestDeviceInfo,
} from "@/lib/auth/current-user";
import { logAdminActivity } from "@/lib/admin/activity-log";
import { createPaidBankTransferPaymentTransaction } from "@/lib/admin/bank-transfer-payments";
import {
  assignPlanToSchool,
  getPlanFeatureValue,
} from "@/lib/subscription/subscription-service";
import { getCouponQuote, redeemCoupon } from "@/lib/promotions/coupon-service";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "حدث خطأ غير معروف أثناء قبول التحويل.";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  let step = "START";
  let resolvedRequestId: string | null = null;

  try {
    step = "CHECK_ADMIN_PERMISSION";
    const adminError = await requireAdminApi();

    if (adminError) {
      return adminError;
    }

    step = "GET_CURRENT_USER";
    const current = await getCurrentSessionUser();

    if (!current?.user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 });
    }

    step = "READ_REQUEST";
    const device = await getRequestDeviceInfo();
    const { requestId } = await context.params;
    resolvedRequestId = requestId;

    const payload = await request.json().catch(() => null);
    const days = Number(payload?.days || 0);
    const adminNote = String(payload?.adminNote || "").trim();

    step = "LOAD_BANK_TRANSFER_REQUEST";
    const transferRequest = await prisma.bankTransferRequest.findUnique({
      where: {
        id: requestId,
      },
    });

    if (!transferRequest) {
      return NextResponse.json(
        { error: "طلب التحويل غير موجود.", step },
        { status: 404 },
      );
    }

    step = "VALIDATE_BANK_TRANSFER_STATUS";
    if (transferRequest.status !== "PENDING") {
      if (transferRequest.status === "PAID") {
        step = "RECOVER_ALREADY_PAID_PAYMENT_TRANSACTION";

        const paymentResult = await createPaidBankTransferPaymentTransaction(
          transferRequest.id,
          {
            actorUserId: current.user.id,
            ipAddress: device.ipAddress,
            userAgent: device.userAgent,
            source: "BANK_TRANSFER_APPROVE_ALREADY_PAID_RECOVERY",
          },
        );

        return NextResponse.json({
          message:
            "هذا الطلب تمت معالجته مسبقًا، وتم التأكد من عملية الدفع المرتبطة به.",
          step,
          requestId: transferRequest.id,
          paymentTransactionId: paymentResult.transaction?.id || null,
          paymentTransactionCreated: paymentResult.wasCreated,
          skippedReason: paymentResult.skippedReason,
        });
      }

      return NextResponse.json(
        {
          error: "هذا الطلب تمت معالجته مسبقًا.",
          step,
          requestId: transferRequest.id,
          currentStatus: transferRequest.status,
        },
        { status: 400 },
      );
    }

    step = "VALIDATE_SCHOOL_ACCOUNT";
    if (!transferRequest.schoolAccountId) {
      return NextResponse.json(
        {
          error: "طلب التحويل لا يحتوي على حساب مدرسة مرتبط.",
          step,
          requestId: transferRequest.id,
        },
        { status: 409 },
      );
    }

    step = "VALIDATE_PLAN_ID";
    if (!transferRequest.planId) {
      return NextResponse.json(
        {
          error:
            "هذا الطلب لا يحتوي على باقة مرتبطة. اطلب من المستخدم إعادة اختيار الباقة ثم رفع التحويل.",
          step,
          requestId: transferRequest.id,
        },
        { status: 400 },
      );
    }

    step = "LOAD_PLAN";
    const plan = await prisma.plan.findUnique({
      where: {
        id: transferRequest.planId,
      },
      include: {
        features: true,
      },
    });

    if (!plan) {
      return NextResponse.json(
        {
          error: "الباقة المرتبطة بطلب التحويل غير موجودة.",
          step,
          requestId: transferRequest.id,
          planId: transferRequest.planId,
        },
        { status: 404 },
      );
    }

    step = "CALCULATE_DURATION";
    const durationDays =
      days > 0
        ? days
        : transferRequest.durationDays && transferRequest.durationDays > 0
          ? transferRequest.durationDays
          : Number(getPlanFeatureValue(plan.features, "durationDays", "30")) ||
            30;

    step = "ASSIGN_PLAN_TO_SCHOOL";
    if (transferRequest.couponCode) {
      step = "REVALIDATE_COUPON";
      const quote = await getCouponQuote({
        code: transferRequest.couponCode,
        planId: plan.id,
        billingCycle:
          transferRequest.billingCycle === "yearly" ? "YEARLY" : "MONTHLY",
        schoolAccountId: transferRequest.schoolAccountId,
      });
      if (quote.finalAmount !== transferRequest.amount) {
        return NextResponse.json(
          { error: "تغيرت صلاحية أو قيمة الكوبون. أعد إنشاء طلب الاشتراك." },
          { status: 409 },
        );
      }
    } else if (transferRequest.promotionId) {
      // The request amount is a historical snapshot. Do not re-resolve the
      // current promotion here: an admin may have changed or expired it after
      // the bank-transfer request was created.
      const originalAmount =
        transferRequest.originalAmount ?? transferRequest.amount;
      const discountAmount = transferRequest.discountAmount ?? 0;
      if (originalAmount - discountAmount !== transferRequest.amount) {
        return NextResponse.json(
          {
            error: "بيانات مبلغ طلب التحويل غير متسقة. أعد إنشاء الطلب.",
          },
          { status: 409 },
        );
      }
    }

    step = "ASSIGN_PLAN_TO_SCHOOL";
    const subscription = await assignPlanToSchool({
      schoolAccountId: transferRequest.schoolAccountId,
      planId: plan.id,
      days: durationDays,
      status: "ACTIVE",
      activatedById: current.user.id,
      reason: `قبول تحويل بنكي وتفعيل باقة ${plan.name} لمدة ${durationDays} يوم`,
    });

    if (transferRequest.couponCode) {
      step = "REDEEM_COUPON";
      await redeemCoupon({
        code: transferRequest.couponCode,
        planId: plan.id,
        billingCycle:
          transferRequest.billingCycle === "yearly" ? "YEARLY" : "MONTHLY",
        schoolAccountId: transferRequest.schoolAccountId,
        subscriptionId: subscription.id,
      });
    }

    step = "MARK_BANK_TRANSFER_AS_PAID";
    await prisma.bankTransferRequest.update({
      where: {
        id: transferRequest.id,
      },
      data: {
        status: "PAID",
        adminNote: [
          transferRequest.adminNote || "",
          adminNote ? `ملاحظة الأدمن: ${adminNote}` : "",
          `تم القبول وتفعيل باقة ${plan.name} لمدة ${durationDays} يوم`,
        ]
          .filter(Boolean)
          .join(" | "),
      },
    });

    step = "CREATE_PAYMENT_TRANSACTION";
    const paymentResult = await createPaidBankTransferPaymentTransaction(
      transferRequest.id,
      {
        actorUserId: current.user.id,
        ipAddress: device.ipAddress,
        userAgent: device.userAgent,
        source: "BANK_TRANSFER_APPROVAL",
      },
    );

    if (!paymentResult.transaction) {
      return NextResponse.json(
        {
          error:
            "تم تفعيل الاشتراك وتحديث طلب التحويل، لكن تعذر إنشاء عملية الدفع المرتبطة.",
          step,
          requestId: transferRequest.id,
          skippedReason: paymentResult.skippedReason,
        },
        { status: 409 },
      );
    }

    step = "WRITE_AUDIT_LOG";
    await logAdminActivity({
      actorUserId: current.user.id,
      category: "PAYMENT",
      action: "BANK_TRANSFER_APPROVED",
      severity: "SUCCESS",
      title: "قبول تحويل بنكي وتفعيل اشتراك",
      details: {
        bankTransferRequestId: transferRequest.id,
        schoolAccountId: transferRequest.schoolAccountId,
        planId: plan.id,
        planName: plan.name,
        durationDays,
        amount: transferRequest.amount,
        currency: transferRequest.currency,
        paymentTransactionId: paymentResult.transaction.id,
        paymentTransactionCreated: paymentResult.wasCreated,
      },
      ipAddress: device.ipAddress,
      userAgent: device.userAgent,
    });

    step = "DONE";
    return NextResponse.json({
      message: `تم قبول التحويل وتفعيل باقة ${plan.name} بنجاح.`,
      step,
      requestId: transferRequest.id,
      paymentTransactionId: paymentResult.transaction.id,
      paymentTransactionCreated: paymentResult.wasCreated,
    });
  } catch (error) {
    console.error("bank transfer approval failed", {
      step,
      requestId: resolvedRequestId,
      error,
    });

    return NextResponse.json(
      {
        error: "تعذر قبول التحويل.",
        step,
        requestId: resolvedRequestId,
        details: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
