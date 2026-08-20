import { calculateCouponDiscount } from "./discount-calculator";
import type { PromotionDiscountTypeValue } from "./promotion-types";

export type AutomaticPromotionLike = {
  id: string;
  name: string;
  isAutomatic: boolean;
  isActive: boolean;
  discountType: PromotionDiscountTypeValue;
  discountValue: number;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
};

export type PlanPriceQuote = {
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  promotionId: string | null;
  promotionName: string | null;
  pricingReason:
    | "BASE_PRICE"
    | "AUTOMATIC_PROMOTION"
    | "MANUAL_OFFER"
    | "COUPON";
};

export type ManualPlanOfferLike = {
  enabled: boolean;
  name: string;
  price: number;
};

export function quoteManualPlanOffer(input: {
  originalAmount: number;
  offer: ManualPlanOfferLike;
}): PlanPriceQuote {
  const originalAmount = Math.max(0, Math.trunc(input.originalAmount));
  const offerPrice = Math.max(0, Math.trunc(input.offer.price));
  const name = input.offer.name.trim();
  if (!input.offer.enabled || !name || offerPrice >= originalAmount) {
    return {
      originalAmount,
      discountAmount: 0,
      finalAmount: originalAmount,
      promotionId: null,
      promotionName: null,
      pricingReason: "BASE_PRICE",
    };
  }
  return {
    originalAmount,
    discountAmount: originalAmount - offerPrice,
    finalAmount: offerPrice,
    promotionId: null,
    promotionName: name,
    pricingReason: "MANUAL_OFFER",
  };
}

function activeAt(promotion: AutomaticPromotionLike, now: Date) {
  const startsAt = promotion.startsAt
    ? new Date(promotion.startsAt).getTime()
    : null;
  const endsAt = promotion.endsAt ? new Date(promotion.endsAt).getTime() : null;
  return (
    promotion.isAutomatic &&
    promotion.isActive &&
    (!startsAt || startsAt <= now.getTime()) &&
    (!endsAt || endsAt >= now.getTime())
  );
}

export function selectAutomaticPromotion(
  promotions: AutomaticPromotionLike[],
  now = new Date(),
) {
  return (
    promotions
      .filter((promotion) => activeAt(promotion, now))
      .sort(
        (left, right) =>
          right.discountValue - left.discountValue ||
          left.id.localeCompare(right.id),
      )[0] || null
  );
}

export function quoteAutomaticPromotion(input: {
  originalAmount: number;
  promotions: AutomaticPromotionLike[];
  now?: Date;
}): PlanPriceQuote {
  const originalAmount = Math.max(0, Math.trunc(input.originalAmount));
  const promotion = selectAutomaticPromotion(input.promotions, input.now);
  if (!promotion) {
    return {
      originalAmount,
      discountAmount: 0,
      finalAmount: originalAmount,
      promotionId: null,
      promotionName: null,
      pricingReason: "BASE_PRICE",
    };
  }
  const amounts = calculateCouponDiscount({
    originalAmount,
    discountType: promotion.discountType,
    discountValue: promotion.discountValue,
  });
  return {
    ...amounts,
    promotionId: promotion.id,
    promotionName: promotion.name,
    pricingReason: "AUTOMATIC_PROMOTION",
  };
}
