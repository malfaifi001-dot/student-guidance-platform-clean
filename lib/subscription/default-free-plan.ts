import { prisma } from "@/lib/prisma";
import { ensureDefaultPlatformServices } from "@/lib/services/default-platform-services";
import type { UserRole } from "@prisma/client";
import {
  assignPlanToSchool,
  getPlanServiceSlugs,
  getRemainingDays,
  isSubscriptionUsable,
} from "@/lib/subscription/subscription-service";

export const DEFAULT_FREE_PLAN_SLUG = "default-free-auto";
export const DEFAULT_FREE_PLAN_FEATURE_KEY = "system:autoDefaultFreePlan";

const DEFAULT_FREE_PLAN_NAME = "الباقة التلقائية";
const DEFAULT_FREE_DURATION_DAYS = 14;
const DEFAULT_FREE_ACCESS_MODE = "ALL_SERVICES";

export type DefaultFreePlanAccessMode = "ALL_SERVICES" | "CUSTOM_SERVICES";

export type DefaultFreePlanMetrics = {
  currentAccountsCount: number;
  convertedAccountsCount: number;
  averageDaysBeforeConversion: number | null;
  sessionCount: number;
  activeDaysCount: number;
  reportCount: number;
};

export type DefaultFreePlanAccount = {
  schoolAccountId: string;
  accountName: string;
  accountSlug: string;
  schoolName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerRole: UserRole | null;
  subscriptionStatus: string;
  startsAt: Date | null;
  endsAt: Date | null;
  remainingDays: number | null;
  usersCount: number;
  studentsCount: number;
  sessionsCount: number;
  activeDaysCount: number;
  reportsCount: number;
};

export type DefaultFreePlanConfig = {
  planId: string;
  planName: string;
  slug: string;
  enabled: boolean;
  durationDays: number;
  accessMode: DefaultFreePlanAccessMode;
  enabledServiceSlugs: string[];
  metrics: DefaultFreePlanMetrics;
  accounts: DefaultFreePlanAccount[];
};

type SaveDefaultFreePlanInput = {
  planName: string;
  enabled: boolean;
  durationDays: number;
  accessMode: DefaultFreePlanAccessMode;
  enabledServiceSlugs: string[];
};

const OWNER_ROLE_PRIORITY: UserRole[] = [
  "SCHOOL_OWNER",
  "COUNSELOR",
  "ACTIVITY_LEADER",
  "TEACHER",
  "STAFF",
  "ADMIN",
];

function normalizeDurationDays(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULT_FREE_DURATION_DAYS;
}

function normalizeAccessMode(value: string): DefaultFreePlanAccessMode {
  return value === "CUSTOM_SERVICES" ? "CUSTOM_SERVICES" : "ALL_SERVICES";
}

function normalizePlanName(value: string) {
  const planName = String(value || "").trim();
  return planName || DEFAULT_FREE_PLAN_NAME;
}

function getSchoolDisplayName(account: {
  profile?: {
    schoolName?: string | null;
  } | null;
}) {
  return String(account.profile?.schoolName || "").trim();
}

function pickAccountOwner(
  users: Array<{
    name: string;
    officialName: string | null;
    email: string;
    phone: string | null;
    role: UserRole;
  }>,
) {
  for (const role of OWNER_ROLE_PRIORITY) {
    const matchedUser = users.find((user) => user.role === role);

    if (matchedUser) {
      return matchedUser;
    }
  }

  return users[0] ?? null;
}

async function getActiveServiceSlugs() {
  const services = await prisma.service.findMany({
    where: {
      status: "ACTIVE",
    },
    orderBy: {
      name: "asc",
    },
    select: {
      slug: true,
    },
  });

  return services.map((service) => service.slug);
}

async function resolveEnabledServiceSlugs(input: {
  accessMode: DefaultFreePlanAccessMode;
  enabledServiceSlugs: string[];
}) {
  const activeServiceSlugs = await getActiveServiceSlugs();

  if (input.accessMode === "ALL_SERVICES") {
    return activeServiceSlugs;
  }

  const activeServiceSet = new Set(activeServiceSlugs);

  return Array.from(
    new Set(
      input.enabledServiceSlugs
        .map((slug) => String(slug || "").trim())
        .filter((slug) => activeServiceSet.has(slug)),
    ),
  );
}

function buildPlanFeatureData(input: SaveDefaultFreePlanInput & { enabledServiceSlugs: string[] }) {
  return [
    {
      key: DEFAULT_FREE_PLAN_FEATURE_KEY,
      label: "تفعيل الباقة التلقائية",
      value: input.enabled ? "enabled" : "disabled",
    },
    {
      key: "durationDays",
      label: "مدة الباقة بالأيام",
      value: String(normalizeDurationDays(input.durationDays)),
    },
    {
      key: "autoFreeAccessMode",
      label: "نوع صلاحيات الباقة التلقائية",
      value: input.accessMode,
    },
    {
      key: "targetAudience",
      label: "الجمهور المستهدف",
      value: "ALL",
    },
    {
      key: "maxStudents",
      label: "حد الطلاب",
      value: "0",
    },
    {
      key: "maxUsers",
      label: "حد المستخدمين",
      value: "0",
    },
    {
      key: "maxReports",
      label: "حد التقارير",
      value: "0",
    },
    ...input.enabledServiceSlugs.map((serviceSlug) => ({
      key: `service:${serviceSlug}`,
      label: `خدمة: ${serviceSlug}`,
      value: "enabled",
    })),
  ];
}

async function upsertDefaultFreePlan(input: SaveDefaultFreePlanInput) {
  await ensureDefaultPlatformServices();

  const planName = normalizePlanName(input.planName);
  const enabledServiceSlugs = await resolveEnabledServiceSlugs(input);
  const featureRows = buildPlanFeatureData({
    ...input,
    enabledServiceSlugs,
  });

  const plan = await prisma.$transaction(async (tx) => {
    const nextPlan = await tx.plan.upsert({
      where: {
        slug: DEFAULT_FREE_PLAN_SLUG,
      },
      update: {
        name: planName,
        priceMonthly: 0,
        priceYearly: 0,
        isActive: input.enabled,
        isPublic: false,
        isArchived: false,
        visibleRoles: [],
      },
      create: {
        name: planName,
        slug: DEFAULT_FREE_PLAN_SLUG,
        priceMonthly: 0,
        priceYearly: 0,
        isActive: input.enabled,
        isPublic: false,
        isArchived: false,
        visibleRoles: [],
      },
    });

    await tx.planFeature.deleteMany({
      where: {
        planId: nextPlan.id,
      },
    });

    await tx.planFeature.createMany({
      data: featureRows.map((feature) => ({
        planId: nextPlan.id,
        key: feature.key,
        label: feature.label,
        value: feature.value,
      })),
    });

    return tx.plan.findUniqueOrThrow({
      where: {
        id: nextPlan.id,
      },
      include: {
        features: true,
      },
    });
  });

  return {
    plan,
    enabledServiceSlugs,
  };
}

async function getDefaultFreePlanMetrics(planId: string): Promise<DefaultFreePlanMetrics> {
  const currentSubscriptions = await prisma.subscription.findMany({
    where: {
      planId,
    },
    select: {
      schoolAccountId: true,
    },
  });

  const schoolAccountIds = currentSubscriptions.map((subscription) => subscription.schoolAccountId);

  const conversionLogs = await prisma.platformActivityLog.findMany({
    where: {
      category: "SUBSCRIPTION",
      action: "default-free-plan-converted",
      schoolAccountId: {
        not: null,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      schoolAccountId: true,
      details: true,
    },
  });

  const convertedSchoolAccountIds = new Set<string>();
  const conversionDays: number[] = [];

  for (const log of conversionLogs) {
    if (typeof log.schoolAccountId === "string" && log.schoolAccountId) {
      convertedSchoolAccountIds.add(log.schoolAccountId);
    }

    const daysValue =
      log.details &&
      typeof log.details === "object" &&
      !Array.isArray(log.details) &&
      "daysOnDefaultFree" in log.details
        ? Number((log.details as Record<string, unknown>).daysOnDefaultFree)
        : NaN;

    if (Number.isFinite(daysValue) && daysValue >= 0) {
      conversionDays.push(daysValue);
    }
  }

  const averageDaysBeforeConversion = conversionDays.length
    ? Number(
        (
          conversionDays.reduce((sum, value) => sum + value, 0) / conversionDays.length
        ).toFixed(1),
      )
    : null;

  if (!schoolAccountIds.length) {
    return {
      currentAccountsCount: 0,
      convertedAccountsCount: convertedSchoolAccountIds.size,
      averageDaysBeforeConversion,
      sessionCount: 0,
      activeDaysCount: 0,
      reportCount: 0,
    };
  }

  const [sessionRows, reportCount] = await Promise.all([
    prisma.userSession.findMany({
      where: {
        user: {
          schoolAccountId: {
            in: schoolAccountIds,
          },
        },
      },
      select: {
        id: true,
        createdAt: true,
        lastSeenAt: true,
      },
    }),
    prisma.reportSnapshot.count({
      where: {
        schoolAccountId: {
          in: schoolAccountIds,
        },
      },
    }),
  ]);

  const activeDays = new Set(
    sessionRows.map((session) => {
      const date = session.lastSeenAt || session.createdAt;
      return date.toISOString().slice(0, 10);
    }),
  );

  return {
    currentAccountsCount: schoolAccountIds.length,
    convertedAccountsCount: convertedSchoolAccountIds.size,
    averageDaysBeforeConversion,
    sessionCount: sessionRows.length,
    activeDaysCount: activeDays.size,
    reportCount,
  };
}

async function getDefaultFreePlanAccounts(): Promise<DefaultFreePlanAccount[]> {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      plan: {
        slug: DEFAULT_FREE_PLAN_SLUG,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      schoolAccountId: true,
      status: true,
      startsAt: true,
      endsAt: true,
      schoolAccount: {
        select: {
          id: true,
          name: true,
          slug: true,
          profile: {
            select: {
              schoolName: true,
            },
          },
          users: {
            orderBy: {
              createdAt: "asc",
            },
            select: {
              name: true,
              officialName: true,
              email: true,
              phone: true,
              role: true,
            },
          },
          _count: {
            select: {
              users: true,
              students: true,
            },
          },
        },
      },
    },
  });

  const schoolAccountIds = subscriptions.map((subscription) => subscription.schoolAccountId);

  if (!schoolAccountIds.length) {
    return [];
  }

  const [sessionRows, reportRows] = await Promise.all([
    prisma.userSession.findMany({
      where: {
        user: {
          schoolAccountId: {
            in: schoolAccountIds,
          },
        },
      },
      select: {
        createdAt: true,
        lastSeenAt: true,
        user: {
          select: {
            schoolAccountId: true,
          },
        },
      },
    }),
    prisma.reportSnapshot.groupBy({
      by: ["schoolAccountId"],
      where: {
        schoolAccountId: {
          in: schoolAccountIds,
        },
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const sessionCountBySchool = new Map<string, number>();
  const activeDaysBySchool = new Map<string, Set<string>>();

  for (const session of sessionRows) {
    const schoolAccountId = session.user.schoolAccountId;

    if (!schoolAccountId) {
      continue;
    }

    sessionCountBySchool.set(
      schoolAccountId,
      (sessionCountBySchool.get(schoolAccountId) || 0) + 1,
    );

    const activeDays = activeDaysBySchool.get(schoolAccountId) || new Set<string>();
    const activityDate = (session.lastSeenAt || session.createdAt).toISOString().slice(0, 10);

    activeDays.add(activityDate);
    activeDaysBySchool.set(schoolAccountId, activeDays);
  }

  const reportCountBySchool = new Map<string, number>();

  for (const row of reportRows) {
    if (!row.schoolAccountId) {
      continue;
    }

    reportCountBySchool.set(row.schoolAccountId, row._count._all);
  }

  return subscriptions.map((subscription) => {
    const schoolAccount = subscription.schoolAccount;
    const owner = pickAccountOwner(schoolAccount.users);

    return {
      schoolAccountId: subscription.schoolAccountId,
      accountName: schoolAccount.name,
      accountSlug: schoolAccount.slug,
      schoolName: getSchoolDisplayName(schoolAccount),
      ownerName:
        String(owner?.officialName || owner?.name || owner?.email || "").trim() || "غير محدد",
      ownerEmail: String(owner?.email || "").trim(),
      ownerPhone: String(owner?.phone || "").trim(),
      ownerRole: owner?.role ?? null,
      subscriptionStatus: subscription.status,
      startsAt: subscription.startsAt,
      endsAt: subscription.endsAt,
      remainingDays: getRemainingDays(subscription.endsAt),
      usersCount: schoolAccount._count.users,
      studentsCount: schoolAccount._count.students,
      sessionsCount: sessionCountBySchool.get(subscription.schoolAccountId) || 0,
      activeDaysCount: activeDaysBySchool.get(subscription.schoolAccountId)?.size || 0,
      reportsCount: reportCountBySchool.get(subscription.schoolAccountId) || 0,
    };
  });
}

export async function ensureDefaultFreePlan() {
  await ensureDefaultPlatformServices();

  const existing = await prisma.plan.findUnique({
    where: {
      slug: DEFAULT_FREE_PLAN_SLUG,
    },
    include: {
      features: true,
    },
  });

  if (!existing) {
    return (
      await upsertDefaultFreePlan({
        planName: DEFAULT_FREE_PLAN_NAME,
        enabled: true,
        durationDays: DEFAULT_FREE_DURATION_DAYS,
        accessMode: DEFAULT_FREE_ACCESS_MODE,
        enabledServiceSlugs: [],
      })
    ).plan;
  }

  const durationDays = normalizeDurationDays(
    Number(existing.features.find((feature) => feature.key === "durationDays")?.value || 0),
  );
  const accessMode = normalizeAccessMode(
    String(existing.features.find((feature) => feature.key === "autoFreeAccessMode")?.value || ""),
  );
  const enabled =
    existing.isActive &&
    existing.features.find((feature) => feature.key === DEFAULT_FREE_PLAN_FEATURE_KEY)?.value !==
      "disabled";
  const enabledServiceSlugs = getPlanServiceSlugs(existing.features);

  const activeServiceSlugs = await getActiveServiceSlugs();
  const expectedServiceSlugs =
    accessMode === "ALL_SERVICES" ? activeServiceSlugs : enabledServiceSlugs;
  const expectedServiceSet = new Set(expectedServiceSlugs);
  const currentServiceSet = new Set(enabledServiceSlugs);
  const hiddenFieldsValid =
    existing.name.trim() === normalizePlanName(existing.name) &&
    existing.priceMonthly === 0 &&
    existing.priceYearly === 0 &&
    existing.isPublic === false &&
    existing.isArchived === false &&
    Array.isArray(existing.visibleRoles) &&
    existing.visibleRoles.length === 0;
  const serviceFeaturesNeedSync =
    expectedServiceSet.size !== currentServiceSet.size ||
    expectedServiceSlugs.some((slug) => !currentServiceSet.has(slug));
  const missingCoreFeatures =
    !existing.features.some((feature) => feature.key === DEFAULT_FREE_PLAN_FEATURE_KEY) ||
    !existing.features.some((feature) => feature.key === "durationDays") ||
    !existing.features.some((feature) => feature.key === "autoFreeAccessMode");

  if (hiddenFieldsValid && !serviceFeaturesNeedSync && !missingCoreFeatures) {
    return existing;
  }

  return (
    await upsertDefaultFreePlan({
      planName: existing.name,
      enabled,
      durationDays,
      accessMode,
      enabledServiceSlugs,
    })
  ).plan;
}

export async function getDefaultFreePlanConfig(): Promise<DefaultFreePlanConfig> {
  const plan = await ensureDefaultFreePlan();
  const accessMode = normalizeAccessMode(
    String(plan.features.find((feature) => feature.key === "autoFreeAccessMode")?.value || ""),
  );
  const enabledServiceSlugs = getPlanServiceSlugs(plan.features);
  const durationDays = normalizeDurationDays(
    Number(plan.features.find((feature) => feature.key === "durationDays")?.value || 0),
  );
  const enabled =
    plan.isActive &&
    plan.features.find((feature) => feature.key === DEFAULT_FREE_PLAN_FEATURE_KEY)?.value !==
      "disabled";
  const [metrics, accounts] = await Promise.all([
    getDefaultFreePlanMetrics(plan.id),
    getDefaultFreePlanAccounts(),
  ]);

  return {
    planId: plan.id,
    planName: plan.name,
    slug: plan.slug,
    enabled,
    durationDays,
    accessMode,
    enabledServiceSlugs,
    metrics,
    accounts,
  };
}

export async function saveDefaultFreePlanConfig(
  input: SaveDefaultFreePlanInput,
): Promise<DefaultFreePlanConfig> {
  await upsertDefaultFreePlan({
    planName: normalizePlanName(input.planName),
    enabled: Boolean(input.enabled),
    durationDays: normalizeDurationDays(input.durationDays),
    accessMode: normalizeAccessMode(input.accessMode),
    enabledServiceSlugs: Array.isArray(input.enabledServiceSlugs)
      ? input.enabledServiceSlugs
      : [],
  });

  return getDefaultFreePlanConfig();
}

export async function assignDefaultFreePlanIfEligible(input: {
  schoolAccountId: string;
  userId?: string;
  source: string;
}) {
  const schoolAccountId = String(input.schoolAccountId || "").trim();

  if (!schoolAccountId) {
    return {
      applied: false,
      reason: "MISSING_SCHOOL_ACCOUNT",
    } as const;
  }

  const plan = await ensureDefaultFreePlan();

  if (!plan.isActive) {
    return {
      applied: false,
      reason: "DEFAULT_PLAN_DISABLED",
    } as const;
  }

  const existingSubscription = await prisma.subscription.findUnique({
    where: {
      schoolAccountId,
    },
    include: {
      plan: true,
    },
  });

  if (
    existingSubscription &&
    existingSubscription.plan?.slug === DEFAULT_FREE_PLAN_SLUG &&
    isSubscriptionUsable(existingSubscription.status, existingSubscription.endsAt)
  ) {
    return {
      applied: false,
      reason: "DEFAULT_PLAN_ALREADY_ACTIVE",
    } as const;
  }

  if (
    existingSubscription &&
    existingSubscription.plan?.slug !== DEFAULT_FREE_PLAN_SLUG &&
    isSubscriptionUsable(existingSubscription.status, existingSubscription.endsAt)
  ) {
    return {
      applied: false,
      reason: "HAS_VALID_SUBSCRIPTION",
    } as const;
  }

  const durationDays = normalizeDurationDays(
    Number(plan.features.find((feature) => feature.key === "durationDays")?.value || 0),
  );

  await assignPlanToSchool({
    schoolAccountId,
    planId: plan.id,
    days: durationDays,
    status: "ACTIVE",
    activatedById: input.userId,
    reason: "تفعيل الباقة التلقائية",
  });

  return {
    applied: true,
    reason: "DEFAULT_PLAN_ASSIGNED",
    source: input.source,
  } as const;
}
