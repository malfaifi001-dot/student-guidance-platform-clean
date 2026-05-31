import { prisma } from "@/lib/prisma";
import type { SubscriptionStatus } from "@prisma/client";

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

export function getPlanServiceSlugs(
  features: Array<{ key: string; value: string | null }>
) {
  return features
    .filter((feature) => feature.key.startsWith("service:"))
    .filter((feature) => feature.value === "enabled")
    .map((feature) => feature.key.replace("service:", ""));
}

export async function syncSchoolServicesFromPlan(input: {
  schoolAccountId: string;
  planId: string;
}) {
  const planFeatures = await prisma.planFeature.findMany({
    where: {
      planId: input.planId,
      key: {
        startsWith: "service:",
      },
      value: "enabled",
    },
  });

  const enabledServiceSlugs = getPlanServiceSlugs(planFeatures);

  const services = await prisma.service.findMany({
    where: {
      slug: {
        in: enabledServiceSlugs,
      },
    },
  });

  for (const service of services) {
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
  }
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

  await prisma.manualActivation.create({
    data: {
      schoolAccountId: input.schoolAccountId,
      activatedById: input.activatedById,
      reason: input.reason || `إسناد باقة ${plan.name}`,
      startsAt: now,
      endsAt,
    },
  });

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
  const overview = await getSchoolSubscriptionOverview(input.schoolAccountId);

  if (!overview.usable) {
    return {
      ok: false,
      reason: "SUBSCRIPTION_INACTIVE" as const,
    };
  }

  const accessRows = await prisma.serviceAccess.findMany({
    where: {
      schoolAccountId: input.schoolAccountId,
    },
  });

  /*
    لو لم يتم ضبط أي ServiceAccess للحساب بعد، نسمح مؤقتًا حتى لا نكسر الحسابات القديمة.
    بعد إسناد باقة من الأدمن، تصبح الخدمات مقيدة حسب الباقة.
  */
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
        slug: input.serviceSlug,
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
