import type { PromotionDiscountTypeValue } from "./promotion-types";

export function calculateCouponDiscount(input: {
  originalAmount: number;
  discountType: PromotionDiscountTypeValue;
  discountValue: number;
}) {
  const originalAmount = Math.max(0, Math.trunc(input.originalAmount));
  const rawDiscount =
    input.discountType === "PERCENTAGE"
      ? (originalAmount * input.discountValue) / 100
      : input.discountValue;
  const discountAmount = Math.min(
    originalAmount,
    Math.max(0, Math.round(rawDiscount)),
  );

  return {
    originalAmount,
    discountAmount,
    finalAmount: Math.max(0, originalAmount - discountAmount),
  };
}

