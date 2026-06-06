import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { ensureDefaultPlatformServices } from "@/lib/services/default-platform-services";
import { logPlanOrderCreatedEvent } from "@/lib/admin/activity-events";
import {
  assignPlanToSchool,
  getPlanFeatureValue,
  getPlanServiceSlugs,
  getRemainingDays,
  isSubscriptionUsable,
} from "@/lib/subscription/subscription-service";

export async function GET() {
  const current = await getCurrentSessionUser();

  if (!current?.user?.schoolAccountId) {
    return NextResponse.json(
      {
        error: "يجب تسجيل الدخول أولًا.",
      },
      {
        status: 401,
      }
    );
  }

  await ensureDefaultPlatformServices();

  const [plans, services, subscription] = await Promise.all([
    prisma.plan.findMany({
      where: {
        isActive: true,
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

  const mappedPlans = plans.map((plan: any) => {
    const serviceSlugs = getPlanServiceSlugs(plan.features);
    const planServices = services.filter((service: any) =>
      serviceSlugs.includes(service.slug)
    );

    return {
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      durationDays: Number(getPlanFeatureValue(plan.features, "durationDays", "30")),
      maxStudents: getPlanFeatureValue(plan.features, "maxStudents", "0"),
      maxUsers: getPlanFeatureValue(plan.features, "maxUsers", "0"),
      maxReports: getPlanFeatureValue(plan.features, "maxReports", "0"),
      services: planServices.map((service: any) => ({
        id: service.id,
        slug: service.slug,
        name: service.name,
      })),
    };
  });

  return NextResponse.json({
    plans: mappedPlans,
    subscription: subscription
      ? {
          status: subscription.status,
          planName: subscription.plan.name,
          endsAt: subscription.endsAt,
          remainingDays: getRemainingDays(subscription.endsAt),
          usable: isSubscriptionUsable(subscription.status, subscription.endsAt),
        }
      : null,
  });
}

export async function POST(request: Request) {
  const current = await getCurrentSessionUser();

  if (!current?.user?.id || !current.user.schoolAccountId) {
    return NextResponse.json(
      {
        error: "يجب تسجيل الدخول أولًا.",
      },
      {
        status: 401,
      }
    );
  }

  const payload = await request.json().catch(() => null);

  const planId = String(payload?.planId || "").trim();
  const billingCycle = String(payload?.billingCycle || "monthly").trim();
  const senderName = String(payload?.senderName || "").trim();
  const phone = String(payload?.phone || "").trim();
  const receiptUrl = String(payload?.receiptUrl || "").trim();
  const note = String(payload?.note || "").trim();

  if (!planId) {
    return NextResponse.json(
      {
        error: "اختر الباقة أولًا.",
      },
      {
        status: 400,
      }
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

  if (!plan || !plan.isActive) {
    return NextResponse.json(
      {
        error: "الباقة غير متاحة حاليًا.",
      },
      {
        status: 400,
      }
    );
  }

  const durationDays =
    billingCycle === "yearly"
      ? 365
      : Number(getPlanFeatureValue(plan.features, "durationDays", "30")) || 30;

  const amount =
    billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;

  if (amount <= 0) {
    await assignPlanToSchool({
      schoolAccountId: current.user.schoolAccountId,
      planId: plan.id,
      days: durationDays,
      status: "ACTIVE",
      activatedById: current.user.id,
      reason: `تفعيل باقة مجانية: ${plan.name}`,
    });

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
      }
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
      billingCycle,
      adminNote: [
        `طلب باقة: ${plan.name}`,
        `نوع الاشتراك: ${billingCycle === "yearly" ? "سنوي" : "شهري"}`,
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
