import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAdminActivity } from "@/lib/admin/activity-log";
import { calculateCouponDiscount } from "./discount-calculator";
import type { BillingCycle, CouponQuote } from "./promotion-types";

export const COUPON_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;

export class CouponValidationError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "CouponValidationError";
    this.code = code;
    this.status = status;
  }
}

export function normalizeCouponCode(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

export function validateCouponCodeFormat(code: string) {
  return COUPON_CODE_PATTERN.test(code);
}

function getPlanAmount(
  plan: { priceMonthly: number; priceYearly: number },
  billingCycle: BillingCycle,
) {
  return billingCycle === "YEARLY" ? plan.priceYearly : plan.priceMonthly;
}

type PromotionClient = Pick<
  Prisma.TransactionClient,
  "coupon" | "couponRedemption" | "plan"
>;

async function quoteWithClient(
  client: PromotionClient,
  input: {
    code: string;
    planId: string;
    billingCycle: BillingCycle;
    schoolAccountId: string;
    now?: Date;
  },
): Promise<CouponQuote> {
  const code = normalizeCouponCode(input.code);
  if (!code) {
    throw new CouponValidationError("EMPTY", "أدخل كود الخصم.");
  }
  if (!validateCouponCodeFormat(code)) {
    throw new CouponValidationError("INVALID", "الكوبون غير صالح.");
  }

  const [coupon, plan] = await Promise.all([
    client.coupon.findUnique({
      where: { code },
      include: {
        promotion: {
          include: { plans: { select: { planId: true } } },
        },
        _count: { select: { redemptions: true } },
      },
    }),
    client.plan.findUnique({
      where: { id: input.planId },
      select: {
        id: true,
        priceMonthly: true,
        priceYearly: true,
        isActive: true,
        isPublic: true,
        isArchived: true,
      },
    }),
  ]);

  if (!coupon || !plan || !plan.isActive || plan.isArchived) {
    throw new CouponValidationError("INVALID", "الكوبون غير صالح.");
  }
  if (!coupon.isActive || !coupon.promotion.isActive) {
    throw new CouponValidationError("DISABLED", "هذا الكوبون غير متاح حاليًا.");
  }

  const now = input.now || new Date();
  if (
    (coupon.promotion.startsAt && coupon.promotion.startsAt > now) ||
    (coupon.promotion.endsAt && coupon.promotion.endsAt < now) ||
    (coupon.expiresAt && coupon.expiresAt < now)
  ) {
    throw new CouponValidationError("EXPIRED", "انتهت صلاحية هذا الكوبون.");
  }

  const targetedPlanIds = coupon.promotion.plans.map((item) => item.planId);
  if (targetedPlanIds.length && !targetedPlanIds.includes(plan.id)) {
    throw new CouponValidationError(
      "WRONG_PLAN",
      "هذا الكوبون غير متاح لهذه الباقة.",
    );
  }

  if (
    coupon.usageLimit !== null &&
    coupon._count.redemptions >= coupon.usageLimit
  ) {
    throw new CouponValidationError(
      "GLOBAL_LIMIT",
      "انتهى الحد المتاح لاستخدام هذا الكوبون.",
    );
  }

  const [promotionUsage, accountUsage] = await Promise.all([
    client.couponRedemption.count({
      where: { promotionId: coupon.promotionId },
    }),
    client.couponRedemption.count({
      where: {
        promotionId: coupon.promotionId,
        schoolAccountId: input.schoolAccountId,
      },
    }),
  ]);

  if (
    coupon.promotion.totalUsageLimit !== null &&
    promotionUsage >= coupon.promotion.totalUsageLimit
  ) {
    throw new CouponValidationError(
      "GLOBAL_LIMIT",
      "انتهى الحد المتاح لاستخدام هذا الكوبون.",
    );
  }
  if (
    coupon.promotion.perAccountLimit !== null &&
    accountUsage >= coupon.promotion.perAccountLimit
  ) {
    throw new CouponValidationError(
      "ACCOUNT_LIMIT",
      "تم استخدام الحد المسموح لهذا الكوبون على هذا الحساب.",
    );
  }

  const amounts = calculateCouponDiscount({
    originalAmount: getPlanAmount(plan, input.billingCycle),
    discountType: coupon.promotion.discountType,
    discountValue: coupon.promotion.discountValue,
  });

  return {
    valid: true,
    couponId: coupon.id,
    couponCode: coupon.code,
    promotionId: coupon.promotionId,
    promotionName: coupon.promotion.name,
    discountType: coupon.promotion.discountType,
    discountValue: coupon.promotion.discountValue,
    ...amounts,
  };
}

export function getCouponQuote(input: {
  code: string;
  planId: string;
  billingCycle: BillingCycle;
  schoolAccountId: string;
  now?: Date;
}) {
  return quoteWithClient(prisma, input);
}

type RedeemCouponInput = {
  code: string;
  planId: string;
  billingCycle: BillingCycle;
  schoolAccountId: string;
  subscriptionId?: string | null;
  paymentTransactionId?: string | null;
};

export async function redeemCouponWithClient(
  tx: Prisma.TransactionClient,
  input: RedeemCouponInput,
) {
    if (input.paymentTransactionId) {
      const existing = await tx.couponRedemption.findUnique({
        where: { paymentTransactionId: input.paymentTransactionId },
      });
      if (existing) return { quote: null, redemption: existing };
    }
    const quote = await quoteWithClient(tx, input);
    const redemption = await tx.couponRedemption.create({
      data: {
        couponId: quote.couponId,
        promotionId: quote.promotionId,
        schoolAccountId: input.schoolAccountId,
        planId: input.planId,
        subscriptionId: input.subscriptionId || null,
        paymentTransactionId: input.paymentTransactionId || null,
        originalAmount: quote.originalAmount,
        discountAmount: quote.discountAmount,
        finalAmount: quote.finalAmount,
      },
    });
    return { quote, redemption };
}

export async function redeemCoupon(input: RedeemCouponInput) {
  const result = await prisma.$transaction((tx) =>
    redeemCouponWithClient(tx, input),
  );
  if (result.quote) {
    await logAdminActivity({
      schoolAccountId: input.schoolAccountId,
      category: "SUBSCRIPTION",
      action: "COUPON_REDEEMED",
      severity: "SUCCESS",
      title: "استخدام كوبون خصم",
      details: {
        couponCode: result.quote.couponCode,
        promotionId: result.quote.promotionId,
        planId: input.planId,
        originalAmount: result.quote.originalAmount,
        discountAmount: result.quote.discountAmount,
        finalAmount: result.quote.finalAmount,
      },
    });
  }
  return result;
}
