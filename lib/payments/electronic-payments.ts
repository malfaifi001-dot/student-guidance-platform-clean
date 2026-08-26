import {
  PaymentMethod,
  PaymentStatus,
  Prisma,
  SubscriptionStatus,
} from "@prisma/client";
import { logAdminActivity } from "@/lib/admin/activity-log";
import { getOrCreateInvoiceForPaymentTransaction } from "@/lib/admin/invoices";
import { prisma } from "@/lib/prisma";
import { isPlanSelfServiceVisible } from "@/lib/subscription/plan-audience";
import {
  resolvePlanBillingCycle,
  resolvePlanSubscriptionPeriod,
} from "@/lib/subscription/subscription-service";
import {
  getCouponQuote,
  redeemCoupon,
  redeemCouponWithClient,
} from "@/lib/promotions/coupon-service";
import { getAutomaticPlanPricing } from "@/lib/promotions/plan-pricing";
import { resolveSalesExperienceForUser } from "@/lib/sales/sales-experience";

export class ElectronicPaymentError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ElectronicPaymentError";
    this.status = status;
  }
}

type BillingCycle = "MONTHLY" | "YEARLY";

type CheckoutInput = {
  requesterUserId: string;
  schoolAccountId: string;
  planId: string;
  billingCycle: BillingCycle;
  providerSlug: string;
  couponCode?: string;
};

type WebhookApplyInput = {
  transactionId?: string | null;
  externalRef?: string | null;
  providerSlug: string;
  payload: unknown;
};

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getObject(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeBillingCycle(value: unknown): BillingCycle {
  return String(value || "MONTHLY").toUpperCase() === "YEARLY"
    ? "YEARLY"
    : "MONTHLY";
}

function getCheckoutAmount(
  plan: {
    priceMonthly: number;
    priceYearly: number;
  },
  billingCycle: BillingCycle,
) {
  return billingCycle === "YEARLY" ? plan.priceYearly : plan.priceMonthly;
}

function buildInternalCheckoutUrl(transactionId: string) {
  return `/dashboard/checkout/transactions/${transactionId}`;
}

export function getPublicProviderConfig(configJson: unknown) {
  const config = getObject(configJson);

  return {
    mode: String(config.mode || "TEST"),
    publicKey: typeof config.publicKey === "string" ? config.publicKey : "",
    checkoutBaseUrl:
      typeof config.checkoutBaseUrl === "string" ? config.checkoutBaseUrl : "",
  };
}

export function getWebhookSecret(configJson: unknown) {
  const config = getObject(configJson);
  return typeof config.webhookSecret === "string" ? config.webhookSecret : "";
}

export async function createCheckoutPaymentTransaction(input: CheckoutInput) {
  let billingCycle = normalizeBillingCycle(input.billingCycle);

  const [plan, provider, requesterUser] = await Promise.all([
    prisma.plan.findUnique({
      where: {
        id: input.planId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        priceMonthly: true,
        priceYearly: true,
        isActive: true,
        isPublic: true,
        isArchived: true,
        visibleRoles: true,
        features: true,
      },
    }),
    prisma.paymentProvider.findUnique({
      where: {
        slug: input.providerSlug,
      },
    }),
    prisma.user.findUnique({
      where: {
        id: input.requesterUserId,
      },
      select: {
        id: true,
        name: true,
        officialName: true,
        email: true,
        jobTitle: true,
        role: true,
        schoolAccountId: true,
      },
    }),
  ]);

  if (
    !plan ||
    !requesterUser ||
    !isPlanSelfServiceVisible(plan, requesterUser.role)
  ) {
    throw new ElectronicPaymentError("الباقة غير متاحة.", 404);
  }

  if (!provider || !provider.isActive) {
    throw new ElectronicPaymentError("مزود الدفع غير متاح حاليًا.", 404);
  }

  billingCycle = resolvePlanBillingCycle(plan.features, billingCycle);

  if (
    !requesterUser ||
    requesterUser.schoolAccountId !== input.schoolAccountId
  ) {
    throw new ElectronicPaymentError(
      "لا يمكن إنشاء عملية الدفع لهذا الحساب.",
      403,
    );
  }

  const salesExperience = await resolveSalesExperienceForUser(requesterUser.id);

  const originalAmount = getCheckoutAmount(plan, billingCycle);
  const couponQuote = input.couponCode
    ? await getCouponQuote({
        code: input.couponCode,
        planId: plan.id,
        billingCycle,
        schoolAccountId: input.schoolAccountId,
      })
    : null;
  const automaticPricing = input.couponCode
    ? null
    : await getAutomaticPlanPricing({
        planId: plan.id,
        plan,
        billingCycle,
      });
  const amount =
    couponQuote?.finalAmount ?? automaticPricing?.finalAmount ?? originalAmount;

  if (!amount || amount <= 0) {
    throw new ElectronicPaymentError("سعر الباقة غير مضبوط لهذه الدورة.", 409);
  }

  const transaction = await prisma.paymentTransaction.create({
    data: {
      providerId: provider.id,
      amount,
      currency: "SAR",
      method: PaymentMethod.CARD,
      status: PaymentStatus.PENDING,
      metadataJson: asJson({
        source: "CHECKOUT",
        salesExperienceMode: salesExperience.effectiveMode,
        productTitle:
          salesExperience.isBagMode ? "الحقيبة الشاملة" : plan.name,
        planId: plan.id,
        planSlug: plan.slug,
        planName: plan.name,
        billingCycle,
        schoolAccountId: input.schoolAccountId,
        requesterUserId: requesterUser.id,
        requesterName: requesterUser.officialName || requesterUser.name,
        requesterEmail: requesterUser.email,
        requesterJobTitle: requesterUser.jobTitle,
        providerSlug: provider.slug,
        couponCode: couponQuote?.couponCode || null,
        promotionId: automaticPricing?.promotionId || null,
        originalAmount,
        discountAmount:
          couponQuote?.discountAmount ?? automaticPricing?.discountAmount ?? 0,
        finalAmount: amount,
        createdAt: new Date().toISOString(),
      }),
    },
  });

  const externalRef = `checkout:${transaction.id}`;

  const updatedTransaction = await prisma.paymentTransaction.update({
    where: {
      id: transaction.id,
    },
    data: {
      externalRef,
    },
    include: {
      provider: true,
    },
  });

  await logAdminActivity({
    actorUserId: requesterUser.id,
    category: "PAYMENT",
    action: "CHECKOUT_TRANSACTION_CREATED",
    severity: "INFO",
    title: "إنشاء عملية دفع من صفحة Checkout",
    details: {
      transactionId: updatedTransaction.id,
      externalRef,
      amount,
      currency: updatedTransaction.currency,
      planId: plan.id,
      planName: plan.name,
      billingCycle,
      providerSlug: provider.slug,
      schoolAccountId: input.schoolAccountId,
    },
  });

  const publicConfig = getPublicProviderConfig(provider.configJson);

  const checkoutUrl = publicConfig.checkoutBaseUrl
    ? `${publicConfig.checkoutBaseUrl}${
        publicConfig.checkoutBaseUrl.includes("?") ? "&" : "?"
      }transactionId=${encodeURIComponent(updatedTransaction.id)}&externalRef=${encodeURIComponent(
        externalRef,
      )}&amount=${encodeURIComponent(String(amount))}&currency=SAR`
    : buildInternalCheckoutUrl(updatedTransaction.id);

  return {
    transaction: updatedTransaction,
    checkoutUrl,
  };
}

export async function applyPaidElectronicPaymentTransaction(
  input: WebhookApplyInput,
) {
  const transaction = await prisma.paymentTransaction.findFirst({
    where: {
      OR: [
        input.transactionId ? { id: input.transactionId } : undefined,
        input.externalRef ? { externalRef: input.externalRef } : undefined,
      ].filter(Boolean) as Prisma.PaymentTransactionWhereInput[],
    },
    include: {
      provider: true,
    },
  });

  if (!transaction) {
    throw new ElectronicPaymentError("عملية الدفع غير موجودة.", 404);
  }

  if (transaction.status === PaymentStatus.PAID) {
    const paidMetadata = getObject(transaction.metadataJson);
    const paidCouponCode =
      typeof paidMetadata.couponCode === "string"
        ? paidMetadata.couponCode
        : null;
    const paidPlanId =
      typeof paidMetadata.planId === "string" ? paidMetadata.planId : null;
    const paidSchoolAccountId =
      typeof paidMetadata.schoolAccountId === "string"
        ? paidMetadata.schoolAccountId
        : null;
    if (
      paidCouponCode &&
      paidPlanId &&
      paidSchoolAccountId &&
      transaction.subscriptionId
    ) {
      await redeemCoupon({
        code: paidCouponCode,
        planId: paidPlanId,
        billingCycle: normalizeBillingCycle(paidMetadata.billingCycle),
        schoolAccountId: paidSchoolAccountId,
        subscriptionId: transaction.subscriptionId,
        paymentTransactionId: transaction.id,
      });
    }
    return {
      transaction,
      wasActivated: false,
      wasAlreadyPaid: true,
    };
  }

  const metadata = getObject(transaction.metadataJson);
  const planId = typeof metadata.planId === "string" ? metadata.planId : null;
  const schoolAccountId =
    typeof metadata.schoolAccountId === "string"
      ? metadata.schoolAccountId
      : null;
  const billingCycle = normalizeBillingCycle(metadata.billingCycle);
  const requesterUserId =
    typeof metadata.requesterUserId === "string"
      ? metadata.requesterUserId
      : null;

  if (!planId || !schoolAccountId) {
    throw new ElectronicPaymentError(
      "بيانات عملية الدفع غير مكتملة للتفعيل.",
      409,
    );
  }

  const couponCodeForPayment =
    typeof metadata.couponCode === "string" ? metadata.couponCode : null;
  if (couponCodeForPayment) {
    const quote = await getCouponQuote({
      code: couponCodeForPayment,
      planId,
      billingCycle,
      schoolAccountId,
    });
    if (quote.finalAmount !== transaction.amount) {
      throw new ElectronicPaymentError("تغيرت صلاحية أو قيمة الكوبون.", 409);
    }
  }

  const paidPlan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { features: true },
  });
  if (!paidPlan) throw new ElectronicPaymentError("الباقة غير متاحة.", 404);
  let period: ReturnType<typeof resolvePlanSubscriptionPeriod>;
  try {
    period = resolvePlanSubscriptionPeriod({
      features: paidPlan.features,
      startsAt: new Date(),
      days: billingCycle === "YEARLY" ? 365 : 30,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "FIXED_END_DATE_PLAN_EXPIRED"
    )
      throw new ElectronicPaymentError("انتهى تاريخ صلاحية هذه الباقة.", 409);
    throw new ElectronicPaymentError("إعداد مدة الباقة غير صالح.", 409);
  }
  const startsAt = period.startsAt;
  const endsAt = period.endsAt;

  const paidTransaction = await prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.upsert({
      where: {
        schoolAccountId,
      },
      update: {
        planId,
        status: SubscriptionStatus.ACTIVE,
        startsAt,
        endsAt,
      },
      create: {
        schoolAccountId,
        planId,
        status: SubscriptionStatus.ACTIVE,
        startsAt,
        endsAt,
      },
    });

    if (couponCodeForPayment) {
      await redeemCouponWithClient(tx, {
        code: couponCodeForPayment,
        planId,
        billingCycle,
        schoolAccountId,
        subscriptionId: subscription.id,
        paymentTransactionId: transaction.id,
      });
    }

    return tx.paymentTransaction.update({
      where: {
        id: transaction.id,
      },
      data: {
        subscriptionId: subscription.id,
        status: PaymentStatus.PAID,
        metadataJson: asJson({
          ...metadata,
          providerSlug: input.providerSlug,
          webhookPayload: input.payload,
          paidAt: new Date().toISOString(),
          activatedAt: new Date().toISOString(),
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
        }),
      },
      include: {
        provider: true,
        subscription: {
          include: {
            plan: true,
            schoolAccount: true,
          },
        },
      },
    });
  });

  await getOrCreateInvoiceForPaymentTransaction(
    paidTransaction.id,
    requesterUserId || null,
  );

  if (couponCodeForPayment) {
    await logAdminActivity({
      actorUserId: requesterUserId || null,
      schoolAccountId,
      category: "SUBSCRIPTION",
      action: "COUPON_REDEEMED",
      severity: "SUCCESS",
      title: "استخدام كوبون خصم بعد نجاح الدفع",
      details: {
        couponCode: couponCodeForPayment,
        planId,
        transactionId: paidTransaction.id,
      },
    });
  }

  await logAdminActivity({
    actorUserId: requesterUserId || null,
    schoolAccountId,
    category: "PAYMENT",
    action: "ELECTRONIC_PAYMENT_PAID_AND_SUBSCRIPTION_ACTIVATED",
    severity: "SUCCESS",
    title: "نجاح دفع إلكتروني وتفعيل الاشتراك",
    details: {
      transactionId: paidTransaction.id,
      externalRef: paidTransaction.externalRef,
      amount: paidTransaction.amount,
      currency: paidTransaction.currency,
      planId,
      billingCycle,
      providerSlug: input.providerSlug,
      subscriptionId: paidTransaction.subscriptionId,
    },
  });

  return {
    transaction: paidTransaction,
    wasActivated: true,
    wasAlreadyPaid: false,
  };
}

export async function applyFailedElectronicPaymentTransaction(input: {
  transactionId?: string | null;
  externalRef?: string | null;
  status: "FAILED" | "CANCELED";
  providerSlug: string;
  payload: unknown;
}) {
  const transaction = await prisma.paymentTransaction.findFirst({
    where: {
      OR: [
        input.transactionId ? { id: input.transactionId } : undefined,
        input.externalRef ? { externalRef: input.externalRef } : undefined,
      ].filter(Boolean) as Prisma.PaymentTransactionWhereInput[],
    },
  });

  if (!transaction) {
    throw new ElectronicPaymentError("عملية الدفع غير موجودة.", 404);
  }

  if (transaction.status === PaymentStatus.PAID) {
    throw new ElectronicPaymentError(
      "لا يمكن تغيير عملية مدفوعة إلى فاشلة أو ملغاة.",
      409,
    );
  }

  const metadata = getObject(transaction.metadataJson);
  const nextStatus =
    input.status === "CANCELED" ? PaymentStatus.CANCELED : PaymentStatus.FAILED;

  const updatedTransaction = await prisma.paymentTransaction.update({
    where: {
      id: transaction.id,
    },
    data: {
      status: nextStatus,
      metadataJson: asJson({
        ...metadata,
        providerSlug: input.providerSlug,
        webhookPayload: input.payload,
        closedAt: new Date().toISOString(),
        closeReason: input.status,
      }),
    },
  });

  await logAdminActivity({
    actorUserId:
      typeof metadata.requesterUserId === "string"
        ? metadata.requesterUserId
        : null,
    schoolAccountId:
      typeof metadata.schoolAccountId === "string"
        ? metadata.schoolAccountId
        : null,
    category: "PAYMENT",
    action:
      input.status === "CANCELED"
        ? "ELECTRONIC_PAYMENT_CANCELED_BY_WEBHOOK"
        : "ELECTRONIC_PAYMENT_FAILED_BY_WEBHOOK",
    severity: input.status === "CANCELED" ? "WARNING" : "ERROR",
    title:
      input.status === "CANCELED"
        ? "إلغاء عملية دفع إلكتروني عبر Webhook"
        : "فشل عملية دفع إلكتروني عبر Webhook",
    details: {
      transactionId: updatedTransaction.id,
      externalRef: updatedTransaction.externalRef,
      amount: updatedTransaction.amount,
      currency: updatedTransaction.currency,
      providerSlug: input.providerSlug,
      status: input.status,
    },
  });

  return updatedTransaction;
}
