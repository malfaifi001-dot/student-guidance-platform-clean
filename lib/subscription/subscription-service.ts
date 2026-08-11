import { prisma } from "@/lib/prisma";
import type { SubscriptionStatus } from "@prisma/client";
import type { PlanAudience } from "./plan-audience";
import {
  getActivityProgramsBillingServiceSlug,
  getActivityProgramsBillingServiceSlugs,
} from "@/lib/activity-programs/activity-program-catalog";

const DEFAULT_FREE_PLAN_SLUG = "default-free-auto";

type PlanFeatureLike = {
  key: string;
  value: string | null;
};

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getRemainingDays(endsAt?: Date | null) {
  if (!endsAt) return null;

  const diff = endsAt.getTime() - Date.now();
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
}

export function isSubscriptionUsable(
  status?: SubscriptionStatus | string | null,
  endsAt?: Date | null
) {
  if (!status) return false;

  if (status === "CANCELED" || status === "EXPIRED" || status === "PAST_DUE") {
    return false;
  }

  if (!endsAt) {
    return status === "ACTIVE" || status === "TRIAL";
  }

  return endsAt.getTime() > Date.now();
}

export function getPlanFeatureValue(
  features: Array<{ key: string; value: string | null }>,
  key: string,
  fallback = "0"
) {
  return features.find((feature) => feature.key === key)?.value || fallback;
}

export function getPlanServiceSlugs(features: PlanFeatureLike[]) {
  return getActivityProgramsBillingServiceSlugs(
    features
      .filter((feature) => feature.key.startsWith("service:"))
      .filter((feature) => feature.value === "enabled")
      .map((feature) => feature.key.replace("service:", "").trim()),
  );
}

export function getPlanAudienceFromFeatures(
  features: Array<{ key: string; value: string | null }>,
): PlanAudience {
  const value = features.find((f) => f.key === "targetAudience")?.value;
  if (value === "GUIDANCE" || value === "ACTIVITY") return value;
  return "ALL";
}

function hasPlanServiceRules(features: PlanFeatureLike[]) {
  return features.some((feature) => feature.key.startsWith("service:"));
}

export async function syncSchoolServicesFromPlan(input: {
  schoolAccountId: string;
  planId: string;
}) {
  const planFeatures = (
    await prisma.planFeature.findMany({
      where: {
        planId: input.planId,
      },
      select: {
        key: true,
        value: true,
      },
    })
  ).filter((feature) => feature.key.startsWith("service:"));

  const enabledServiceSlugs = getPlanServiceSlugs(planFeatures);

  if (!enabledServiceSlugs.length) {
    return {
      enabledServiceCount: 0,
      missingServiceSlugs: [],
      skippedReason: "PLAN_HAS_NO_ENABLED_SERVICE_FEATURES",
    };
  }

  const enabledServices = await prisma.service.findMany({
    where: {
      slug: {
        in: enabledServiceSlugs,
      },
    },
    select: {
      id: true,
      slug: true,
    },
  });

  const foundServiceSlugs = new Set(enabledServices.map((service) => service.slug));
  const missingServiceSlugs = enabledServiceSlugs.filter(
    (slug) => !foundServiceSlugs.has(slug)
  );

  if (missingServiceSlugs.length) {
    throw new Error(
      `الباقة تحتوي على خدمات غير موجودة في جدول Service: ${missingServiceSlugs.join(", ")}`
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.serviceAccess.updateMany({
      where: {
        schoolAccountId: input.schoolAccountId,
      },
      data: {
        isEnabled: false,
        isPaid: false,
      },
    });

    for (const service of enabledServices) {
      await tx.serviceAccess.upsert({
        where: {
          schoolAccountId_serviceId: {
            schoolAccountId: input.schoolAccountId,
            serviceId: service.id,
          },
        },
        update: {
          isEnabled: true,
          isPaid: true,
        },
        create: {
          schoolAccountId: input.schoolAccountId,
          serviceId: service.id,
          isEnabled: true,
          isPaid: true,
        },
      });
    }
  });

  return {
    enabledServiceCount: enabledServices.length,
    missingServiceSlugs,
    skippedReason: null,
  };
}

export async function assignPlanToSchool(input: {
  schoolAccountId: string;
  planId: string;
  days?: number;
  status?: SubscriptionStatus;
  activatedById?: string;
  reason?: string;
}) {
  const plan = await prisma.plan.findUnique({
    where: {
      id: input.planId,
    },
    include: {
      features: true,
    },
  });

  if (!plan) {
    throw new Error("الباقة غير موجودة.");
  }

  const currentSubscription = await prisma.subscription.findUnique({
    where: {
      schoolAccountId: input.schoolAccountId,
    },
    include: {
      plan: {
        select: {
          slug: true,
          name: true,
        },
      },
    },
  });

  const durationDays =
    input.days && input.days > 0
      ? input.days
      : Number(getPlanFeatureValue(plan.features, "durationDays", "30")) || 30;

  const now = new Date();
  const endsAt = addDays(now, durationDays);

  const subscription = await prisma.subscription.upsert({
    where: {
      schoolAccountId: input.schoolAccountId,
    },
    update: {
      planId: plan.id,
      status: input.status || "ACTIVE",
      startsAt: now,
      endsAt,
    },
    create: {
      schoolAccountId: input.schoolAccountId,
      planId: plan.id,
      status: input.status || "ACTIVE",
      startsAt: now,
      endsAt,
    },
  });

  await syncSchoolServicesFromPlan({
    schoolAccountId: input.schoolAccountId,
    planId: plan.id,
  });

  if (
    currentSubscription?.plan?.slug === DEFAULT_FREE_PLAN_SLUG &&
    plan.slug !== DEFAULT_FREE_PLAN_SLUG
  ) {
    try {
      const convertedAt = new Date();
      const daysOnDefaultFree = Math.max(
        Math.ceil(
          (convertedAt.getTime() - currentSubscription.startsAt.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
        0,
      );

      await prisma.platformActivityLog.create({
        data: {
          actorUserId: input.activatedById || null,
          schoolAccountId: input.schoolAccountId,
          category: "SUBSCRIPTION",
          action: "default-free-plan-converted",
          severity: "SUCCESS",
          title: "انتقل الحساب من الباقة التلقائية إلى باقة اشتراك",
          details: {
            fromPlanSlug: currentSubscription.plan.slug,
            toPlanId: plan.id,
            toPlanName: plan.name,
            startedAt: currentSubscription.startsAt.toISOString(),
            convertedAt: convertedAt.toISOString(),
            daysOnDefaultFree,
          },
        },
      });
    } catch (error) {
      console.error("default free plan conversion audit failed", error);
    }
  }

  try {
    await prisma.manualActivation.create({
      data: {
        schoolAccountId: input.schoolAccountId,
        activatedById: input.activatedById || null,
        reason: input.reason || `إسناد باقة ${plan.name}`,
        startsAt: now,
        endsAt,
      },
    });
  } catch (error) {
    console.error("manual activation audit failed", error);
  }

  return subscription;
}

export async function getSchoolSubscriptionOverview(schoolAccountId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: {
      schoolAccountId,
    },
    include: {
      plan: {
        include: {
          features: true,
        },
      },
    },
  });

  const usable = isSubscriptionUsable(
    subscription?.status,
    subscription?.endsAt
  );

  return {
    subscription,
    usable,
    remainingDays: getRemainingDays(subscription?.endsAt),
  };
}

export async function isServiceAllowedForSchool(input: {
  schoolAccountId: string;
  serviceSlug: string;
}) {
  const billingServiceSlug = getActivityProgramsBillingServiceSlug(
    input.serviceSlug,
  );
  const overview = await getSchoolSubscriptionOverview(input.schoolAccountId);

  if (!overview.usable) {
    return {
      ok: false,
      reason: "SUBSCRIPTION_INACTIVE" as const,
    };
  }

  const planFeatures = overview.subscription?.plan?.features || [];
  const planServiceSlugs = getPlanServiceSlugs(planFeatures);

  if (planServiceSlugs.includes(billingServiceSlug)) {
    const service = await prisma.service.findFirst({
      where: {
        slug: billingServiceSlug,
      },
      select: {
        id: true,
      },
    });

    if (!service) {
      return {
        ok: false,
        reason: "SERVICE_NOT_FOUND" as const,
      };
    }

    await prisma.serviceAccess.upsert({
      where: {
        schoolAccountId_serviceId: {
          schoolAccountId: input.schoolAccountId,
          serviceId: service.id,
        },
      },
      update: {
        isEnabled: true,
        isPaid: true,
      },
      create: {
        schoolAccountId: input.schoolAccountId,
        serviceId: service.id,
        isEnabled: true,
        isPaid: true,
      },
    });

    return {
      ok: true,
      reason: "SERVICE_INCLUDED_BY_PLAN" as const,
    };
  }

  if (hasPlanServiceRules(planFeatures)) {
    return {
      ok: false,
      reason: "SERVICE_NOT_INCLUDED" as const,
    };
  }

  const accessRows = await prisma.serviceAccess.findMany({
    where: {
      schoolAccountId: input.schoolAccountId,
    },
  });

  if (accessRows.length === 0) {
    return {
      ok: true,
      reason: "NO_SERVICE_RULES_YET" as const,
    };
  }

  const serviceAccess = await prisma.serviceAccess.findFirst({
    where: {
      schoolAccountId: input.schoolAccountId,
      service: {
        slug: billingServiceSlug,
      },
    },
  });

  if (!serviceAccess?.isEnabled) {
    return {
      ok: false,
      reason: "SERVICE_NOT_INCLUDED" as const,
    };
  }

  return {
    ok: true,
    reason: "SERVICE_INCLUDED" as const,
  };
}
