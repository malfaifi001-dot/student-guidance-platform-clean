import { prisma } from "@/lib/prisma";
import {
  quoteAutomaticPromotion,
  quoteManualPlanOffer,
  type PlanPriceQuote,
} from "./pricing-core";
import { getCouponQuote } from "./coupon-service";
import type { BillingCycle, CouponQuote } from "./promotion-types";

type PlanFeatureLike = { key: string; value: string | null };

function featureValue(
  features: PlanFeatureLike[] | undefined,
  key: string,
  fallback = "",
) {
  return features?.find((feature) => feature.key === key)?.value || fallback;
}

function baseAmount(
  plan: { priceMonthly: number; priceYearly: number },
  billingCycle: BillingCycle,
) {
  return billingCycle === "YEARLY" ? plan.priceYearly : plan.priceMonthly;
}

export async function getAutomaticPlanPricing(input: {
  planId: string;
  plan: {
    priceMonthly: number;
    priceYearly: number;
    features?: PlanFeatureLike[];
  };
  billingCycle: BillingCycle;
  now?: Date;
}): Promise<PlanPriceQuote> {
  const originalAmount = baseAmount(input.plan, input.billingCycle);
  const manualOffer = quoteManualPlanOffer({
    originalAmount,
    offer: {
      enabled: featureValue(input.plan.features, "manualOfferEnabled") === "true",
      name: featureValue(input.plan.features, "manualOfferName"),
      price: Number(featureValue(input.plan.features, "manualOfferPrice", "0")),
    },
  });
  if (manualOffer.pricingReason === "MANUAL_OFFER") return manualOffer;

  const promotions = await prisma.promotion.findMany({
    where: {
      isAutomatic: true,
      isActive: true,
      plans: { some: { planId: input.planId } },
    },
    select: {
      id: true,
      name: true,
      isAutomatic: true,
      isActive: true,
      discountType: true,
      discountValue: true,
      startsAt: true,
      endsAt: true,
    },
  });
  return quoteAutomaticPromotion({
    originalAmount,
    promotions,
    now: input.now,
  });
}

export type StackedPlanPricing = {
  valid: true;
  baseAmount: number;
  originalAmount: number;
  promotionDiscountAmount: number;
  priceAfterPromotion: number;
  couponDiscountAmount: number;
  totalDiscountAmount: number;
  discountAmount: number;
  finalAmount: number;
  promotionId: string | null;
  promotionName: string | null;
  couponId: string | null;
  couponCode: string | null;
  couponPromotionId: string | null;
  couponPromotionName: string | null;
  couponBaseAmount: number | null;
  discountType: CouponQuote["discountType"] | null;
  discountValue: number | null;
  pricingReason: PlanPriceQuote["pricingReason"];
};

export async function getPlanPricing(input: {
  planId: string;
  plan?: {
    priceMonthly: number;
    priceYearly: number;
    features?: PlanFeatureLike[];
  };
  billingCycle: BillingCycle;
  schoolAccountId: string;
  couponCode?: string | null;
  now?: Date;
}): Promise<StackedPlanPricing> {
  const plan = input.plan || (await prisma.plan.findUnique({
    where: { id: input.planId },
    include: { features: true },
  }));

  if (!plan) {
    throw new Error("PLAN_NOT_FOUND");
  }

  const promotion = await getAutomaticPlanPricing({
    planId: input.planId,
    plan,
    billingCycle: input.billingCycle,
    now: input.now,
  });
  const couponCode = String(input.couponCode || "").trim();

  if (!couponCode) {
    return {
      valid: true,
      baseAmount: promotion.originalAmount,
      originalAmount: promotion.originalAmount,
      promotionDiscountAmount: promotion.discountAmount,
      priceAfterPromotion: promotion.finalAmount,
      couponDiscountAmount: 0,
      totalDiscountAmount: promotion.discountAmount,
      discountAmount: promotion.discountAmount,
      finalAmount: promotion.finalAmount,
      promotionId: promotion.promotionId,
      promotionName: promotion.promotionName,
      couponId: null,
      couponCode: null,
      couponPromotionId: null,
      couponPromotionName: null,
      couponBaseAmount: null,
      discountType: null,
      discountValue: null,
      pricingReason: promotion.pricingReason,
    };
  }

  const coupon = await getCouponQuote({
    code: couponCode,
    planId: input.planId,
    billingCycle: input.billingCycle,
    schoolAccountId: input.schoolAccountId,
    baseAmount: promotion.finalAmount,
    now: input.now,
  });

  return {
    valid: true,
    baseAmount: promotion.originalAmount,
    originalAmount: promotion.originalAmount,
    promotionDiscountAmount: promotion.discountAmount,
    priceAfterPromotion: promotion.finalAmount,
    couponDiscountAmount: coupon.discountAmount,
    totalDiscountAmount: promotion.discountAmount + coupon.discountAmount,
    discountAmount: promotion.discountAmount + coupon.discountAmount,
    finalAmount: coupon.finalAmount,
    promotionId: promotion.promotionId,
    promotionName: promotion.promotionName,
    couponId: coupon.couponId,
    couponCode: coupon.couponCode,
    couponPromotionId: coupon.promotionId,
    couponPromotionName: coupon.promotionName,
    couponBaseAmount: coupon.couponBaseAmount,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    pricingReason: "COUPON",
  };
}
