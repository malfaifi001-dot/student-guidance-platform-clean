import { prisma } from "@/lib/prisma";
import {
  quoteAutomaticPromotion,
  quoteManualPlanOffer,
  type PlanPriceQuote,
} from "./pricing-core";
import type { BillingCycle } from "./promotion-types";

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
