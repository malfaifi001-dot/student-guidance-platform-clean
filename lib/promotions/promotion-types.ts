export type PromotionDiscountTypeValue = "PERCENTAGE" | "FIXED_AMOUNT";

export type CouponQuote = {
  valid: true;
  couponId: string;
  couponCode: string;
  promotionId: string;
  promotionName: string;
  discountType: PromotionDiscountTypeValue;
  discountValue: number;
  originalAmount: number;
  couponBaseAmount: number;
  discountAmount: number;
  finalAmount: number;
};

export type BillingCycle = "MONTHLY" | "YEARLY";
