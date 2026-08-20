import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { ensureDefaultPlatformServices } from "@/lib/services/default-platform-services";
import { logPlanOrderCreatedEvent } from "@/lib/admin/activity-events";
import { DEFAULT_FREE_PLAN_SLUG } from "@/lib/subscription/default-free-plan";
import {
  getPlanAudience,
  getRoleEligiblePlanServiceSlugs,
  isPlanSelfServiceVisible,
} from "@/lib/subscription/plan-audience";
import {
  assignPlanToSchool,
  getPlanFeatureValue,
  getPlanServiceSlugs,
  getRemainingDays,
  isSubscriptionUsable,
  getPlanCommercialType,
  getPlanDurationMode,
  getPlanFixedEndDate,
  resolvePlanBillingCycle,
} from "@/lib/subscription/subscription-service";
import { getSubscriptionPeriodLabel } from "@/lib/subscription/subscription-presentation";
import {
  CouponValidationError,
  getCouponQuote,
  redeemCoupon,
} from "@/lib/promotions/coupon-service";
import { getAutomaticPlanPricing } from "@/lib/promotions/plan-pricing";

export async function GET() {
  const current = await getCurrentSessionUser();

  if (!current?.user) {
    return NextResponse.json(
      {
        error: "يجب تسجيل الدخول أولًا.",
      },
      {
        status: 401,
      },
    );
  }

  if (!current.user.schoolAccountId) {
    return NextResponse.json(
      { error: "لم يتم ربط الحساب بمدرسة." },
      { status: 403 },
    );
  }

  await ensureDefaultPlatformServices();

  const [plans, services, subscription] = await Promise.all([
    prisma.plan.findMany({
      where: {
        isActive: true,
        isPublic: true,
        isArchived: false,
        slug: {
          not: DEFAULT_FREE_PLAN_SLUG,
        },
      },
      orderBy: {
        priceMonthly: "asc",
      },
      include: {
        features: true,
      },
    }),

    prisma.service.findMany({
      orderBy: {
        name: "asc",
      },
    }),

    prisma.subscription.findUnique({
      where: {
        schoolAccountId: current.user.schoolAccountId,
      },
      include: {
        plan: true,
      },
    }),
  ]);

  const role = current.user.role;
  const visiblePlans = plans.filter(
    (plan) =>
      plan.slug !== DEFAULT_FREE_PLAN_SLUG &&
      isPlanSelfServiceVisible(plan, role),
  );

  const mappedPlans = await Promise.all(
    visiblePlans.map(async (plan) => {
      const serviceSlugs = getRoleEligiblePlanServiceSlugs(
        role,
        getPlanServiceSlugs(plan.features),
      );
      const planServices = services.filter((service) =>
        serviceSlugs.includes(service.slug),
      );
      const audience = getPlanAudience(plan.features);
      const billingCycle = resolvePlanBillingCycle(plan.features, "MONTHLY");
      const pricing = await getAutomaticPlanPricing({
        planId: plan.id,
        plan,
        billingCycle,
      });

      return {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        durationDays: Number(
          getPlanFeatureValue(plan.features, "durationDays", "30"),
        ),
        maxStudents: getPlanFeatureValue(plan.features, "maxStudents", "0"),
        maxUsers: getPlanFeatureValue(plan.features, "maxUsers", "0"),
        maxReports: getPlanFeatureValue(plan.features, "maxReports", "0"),
        targetAudience: audience,
        serviceAccessMode: getPlanFeatureValue(
          plan.features,
          "serviceAccessMode",
          "CUSTOM_SERVICES",
        ),
        commercialType: getPlanCommercialType(plan.features),
        durationMode: getPlanDurationMode(plan.features),
        fixedEndDate: getPlanFixedEndDate(plan.features),
        pricing,
        services: planServices.map((service) => ({
          id: service.id,
          slug: service.slug,
          name: service.name,
        })),
      };
    }),
  );

  return NextResponse.json({
    plans: mappedPlans,
    subscription: subscription
      ? {
          status: subscription.status,
          planId: subscription.planId,
          planName: subscription.plan.name,
          planSlug: subscription.plan.slug,
          startsAt: subscription.startsAt,
          endsAt: subscription.endsAt,
          remainingDays: getRemainingDays(subscription.endsAt),
          usable: isSubscriptionUsable(
            subscription.status,
            subscription.endsAt,
          ),
        }
      : null,
  });
}

export async function POST(request: Request) {
  const current = await getCurrentSessionUser();

  if (!current?.user?.id) {
    return NextResponse.json(
      {
        error: "يجب تسجيل الدخول أولًا.",
      },
      {
        status: 401,
      },
    );
  }

  if (!current.user.schoolAccountId) {
    return NextResponse.json(
      { error: "لم يتم ربط الحساب بمدرسة." },
      { status: 403 },
    );
  }

  const payload = await request.json().catch(() => null);

  const planId = String(payload?.planId || "").trim();
  const requestedBillingCycle = String(
    payload?.billingCycle || "monthly",
  ).trim();
  const senderName = String(payload?.senderName || "").trim();
  const phone = String(payload?.phone || "").trim();
  const receiptUrl = String(payload?.receiptUrl || "").trim();
  const note = String(payload?.note || "").trim();
  const couponCode = String(payload?.couponCode || "").trim();

  if (!planId) {
    return NextResponse.json(
      {
        error: "اختر الباقة أولًا.",
      },
      {
        status: 400,
      },
    );
  }

  const plan = await prisma.plan.findUnique({
    where: {
      id: planId,
    },
    include: {
      features: true,
    },
  });

  if (!plan) {
    return NextResponse.json(
      {
        error: "الباقة غير متاحة حاليًا.",
      },
      {
        status: 400,
      },
    );
  }

  const billingCycle = resolvePlanBillingCycle(
    plan.features,
    requestedBillingCycle === "yearly" ? "YEARLY" : "MONTHLY",
  );

  if (plan.slug === DEFAULT_FREE_PLAN_SLUG) {
    return NextResponse.json(
      {
        error: "هذه الباقة تُدار تلقائيًا من النظام.",
      },
      {
        status: 400,
      },
    );
  }

  if (!isPlanSelfServiceVisible(plan, current.user.role)) {
    return NextResponse.json(
      {
        error: "الباقة غير متاحة حاليًا.",
      },
      {
        status: 400,
      },
    );
  }

  const durationDays =
    billingCycle === "YEARLY"
      ? 365
      : Number(getPlanFeatureValue(plan.features, "durationDays", "30")) || 30;

  const originalAmount =
    billingCycle === "YEARLY" ? plan.priceYearly : plan.priceMonthly;
  let amount = originalAmount;
  let couponQuote: Awaited<ReturnType<typeof getCouponQuote>> | null = null;
  const automaticPricing = couponCode
    ? null
    : await getAutomaticPlanPricing({
        planId: plan.id,
        plan,
        billingCycle,
      });

  if (couponCode) {
    try {
      couponQuote = await getCouponQuote({
        code: couponCode,
        planId: plan.id,
        billingCycle,
        schoolAccountId: current.user.schoolAccountId,
      });
      amount = couponQuote.finalAmount;
    } catch (error) {
      if (error instanceof CouponValidationError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.status },
        );
      }
      throw error;
    }
  } else {
    amount = automaticPricing?.finalAmount ?? originalAmount;
  }

  if (amount <= 0) {
    const subscription = await assignPlanToSchool({
      schoolAccountId: current.user.schoolAccountId,
      planId: plan.id,
      days: durationDays,
      status: "ACTIVE",
      activatedById: current.user.id,
      reason: `تفعيل باقة مجانية: ${plan.name}`,
    });

    if (couponQuote) {
      await redeemCoupon({
        code: couponQuote.couponCode,
        planId: plan.id,
        billingCycle,
        schoolAccountId: current.user.schoolAccountId,
        subscriptionId: subscription.id,
      });
    }

    return NextResponse.json({
      message: "تم تفعيل الباقة مباشرة.",
      activated: true,
    });
  }

  if (!senderName) {
    return NextResponse.json(
      {
        error: "اكتب اسم المحوّل.",
      },
      {
        status: 400,
      },
    );
  }

  await prisma.bankTransferRequest.create({
    data: {
      schoolAccountId: current.user.schoolAccountId,
      amount,
      currency: "SAR",
      senderName,
      receiptUrl: receiptUrl || null,
      status: "PENDING",
      planId: plan.id,
      durationDays,
      requesterUserId: current.user.id,
      billingCycle: billingCycle === "YEARLY" ? "yearly" : "monthly",
      couponCode: couponQuote?.couponCode || null,
      promotionId: automaticPricing?.promotionId || null,
      originalAmount,
      discountAmount:
        couponQuote?.discountAmount ?? automaticPricing?.discountAmount ?? 0,
      adminNote: [
        `طلب باقة: ${plan.name}`,
        `نوع الاشتراك: ${getSubscriptionPeriodLabel(billingCycle)}`,
        phone ? `جوال: ${phone}` : "",
        note ? `ملاحظة: ${note}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
    },
  });

  // audit-log:plan-order-created
  await logPlanOrderCreatedEvent({
    userId: current.user.id,
    schoolAccountId: current.user.schoolAccountId,
    planId: plan.id,
    planName: plan.name,
    billingCycle,
    amount,
  });

  return NextResponse.json({
    message:
      "تم إرسال طلب الاشتراك. بعد مراجعة التحويل من الأدمن سيتم تفعيل الباقة تلقائيًا.",
  });
}
