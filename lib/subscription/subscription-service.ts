import { prisma } from "@/lib/prisma";
import type { SubscriptionStatus } from "@prisma/client";
import type { PlanAudience } from "./plan-audience";
import {
  getActivityProgramsBillingServiceSlug,
} from "@/lib/activity-programs/activity-program-catalog";
import {
  getPlanCommercialType,
  getPlanDurationMode,
  getPlanFixedEndDate,
  getPlanServiceSlugs,
  resolvePlanBillingCycle,
  type CommercialPlanType,
  type PlanBillingCycle,
  type PlanDurationMode,
  type PlanFeatureLike,
} from "./plan-metadata";

export {
  getPlanCommercialType,
  getPlanDurationMode,
  getPlanFixedEndDate,
  getPlanServiceSlugs,
  resolvePlanBillingCycle,
} from "./plan-metadata";
export type { CommercialPlanType, PlanBillingCycle, PlanDurationMode, PlanFeatureLike } from "./plan-metadata";

const DEFAULT_FREE_PLAN_SLUG = "default-free-auto";

export function resolvePlanSubscriptionPeriod(input: {
  features: PlanFeatureLike[];
  days?: number;
  startsAt?: Date;
}) {
  const startsAt = input.startsAt || new Date();
  const mode = getPlanDurationMode(input.features);
  if (mode === "FIXED_END_DATE") {
    const endsAt = getPlanFixedEndDate(input.features);
    if (!endsAt) throw new Error("FIXED_END_DATE_PLAN_CONFIGURATION_INVALID");
    if (endsAt.getTime() <= startsAt.getTime()) throw new Error("FIXED_END_DATE_PLAN_EXPIRED");
    return { startsAt, endsAt, durationMode: mode, durationDays: null };
  }
  const configuredDays = Number(getPlanFeatureValue(input.features, "durationDays", "30"));
  const durationDays = input.days && input.days > 0 ? input.days : configuredDays > 0 ? configuredDays : 30;
  return { startsAt, endsAt: addDays(startsAt, durationDays), durationMode: mode, durationDays };
}

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

export async function syncPlanEntitlementsForSubscribers(input: {
  planId: string;
  previousServiceSlugs: string[];
  nextServiceSlugs: string[];
}) {
  const previous = new Set(input.previousServiceSlugs);
  const next = new Set(input.nextServiceSlugs);
  const addedSlugs = [...next].filter((slug) => !previous.has(slug));
  const removedSlugs = [...previous].filter((slug) => !next.has(slug));
  if (!addedSlugs.length && !removedSlugs.length) return { affectedSubscribers: 0, addedSlugs, removedSlugs };

  const subscriptions = await prisma.subscription.findMany({
    where: { planId: input.planId },
    select: { schoolAccountId: true },
  });
  const services = await prisma.service.findMany({
    where: { slug: { in: [...new Set([...addedSlugs, ...removedSlugs])] } },
    select: { id: true, slug: true },
  });
  const serviceBySlug = new Map(services.map((service) => [service.slug, service.id]));

  await prisma.$transaction(async (tx) => {
    for (const subscription of subscriptions) {
      for (const slug of addedSlugs) {
        const serviceId = serviceBySlug.get(slug);
        if (!serviceId) continue;
        await tx.serviceAccess.upsert({
          where: { schoolAccountId_serviceId: { schoolAccountId: subscription.schoolAccountId, serviceId } },
          update: { isEnabled: true, isPaid: true },
          create: { schoolAccountId: subscription.schoolAccountId, serviceId, isEnabled: true, isPaid: true },
        });
      }
      for (const slug of removedSlugs) {
        const serviceId = serviceBySlug.get(slug);
        if (!serviceId) continue;
        // Plan-generated entitlements are marked paid. Manual overrides remain untouched.
        await tx.serviceAccess.updateMany({
          where: { schoolAccountId: subscription.schoolAccountId, serviceId, isPaid: true },
          data: { isEnabled: false, isPaid: false },
        });
      }
    }
  });
  return { affectedSubscribers: subscriptions.length, addedSlugs, removedSlugs };
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

  const period = resolvePlanSubscriptionPeriod({
    features: plan.features,
    days: input.days,
  });
  const now = period.startsAt;
  const endsAt = period.endsAt;

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
