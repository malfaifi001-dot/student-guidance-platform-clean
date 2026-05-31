import { prisma } from "@/lib/prisma";
import type { PaymentStatus, SubscriptionStatus } from "@prisma/client";

const TRIAL_DAYS = 14;
const DEFAULT_ACTIVATION_DAYS = 30;

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getRemainingDays(endsAt?: Date | null) {
  if (!endsAt) return null;

  const diff = endsAt.getTime() - Date.now();
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
}

export function isSubscriptionUsable(status?: SubscriptionStatus | null, endsAt?: Date | null) {
  if (!status) return false;
  if (status === "CANCELED" || status === "EXPIRED" || status === "PAST_DUE") return false;
  if (!endsAt) return status === "ACTIVE" || status === "TRIAL";

  return endsAt.getTime() > Date.now();
}

export async function ensureSimpleActivationPlan() {
  return prisma.plan.upsert({
    where: {
      slug: "simple-counselor",
    },
    update: {
      isActive: true,
    },
    create: {
      name: "تفعيل الموجه",
      slug: "simple-counselor",
      priceMonthly: 0,
      priceYearly: 0,
      isActive: true,
    },
  });
}

export async function ensureTrialSubscription(schoolAccountId: string) {
  const existing = await prisma.subscription.findUnique({
    where: {
      schoolAccountId,
    },
    include: {
      plan: true,
    },
  });

  if (existing) return existing;

  const plan = await ensureSimpleActivationPlan();

  return prisma.subscription.create({
    data: {
      schoolAccountId,
      planId: plan.id,
      status: "TRIAL",
      startsAt: new Date(),
      endsAt: addDays(new Date(), TRIAL_DAYS),
    },
    include: {
      plan: true,
    },
  });
}

export async function getActivationOverview(schoolAccountId: string) {
  const subscription = await ensureTrialSubscription(schoolAccountId);

  const pendingBankRequests = await prisma.bankTransferRequest.count({
    where: {
      schoolAccountId,
      status: "PENDING",
    },
  });

  const remainingDays = getRemainingDays(subscription.endsAt);
  const usable = isSubscriptionUsable(subscription.status, subscription.endsAt);

  return {
    subscription,
    pendingBankRequests,
    remainingDays,
    usable,
  };
}

export async function activateSchoolAccount(input: {
  schoolAccountId: string;
  days?: number;
  status?: PaymentStatus;
  reason?: string;
  activatedById?: string;
}) {
  const plan = await ensureSimpleActivationPlan();

  const now = new Date();
  const current = await prisma.subscription.findUnique({
    where: {
      schoolAccountId: input.schoolAccountId,
    },
  });

  const baseDate =
    current?.endsAt && current.endsAt.getTime() > now.getTime()
      ? current.endsAt
      : now;

  const durationDays = input.days || DEFAULT_ACTIVATION_DAYS;
  const nextEndsAt = addDays(baseDate, durationDays);

  const subscription = await prisma.subscription.upsert({
    where: {
      schoolAccountId: input.schoolAccountId,
    },
    update: {
      planId: plan.id,
      status: "ACTIVE",
      startsAt: current?.startsAt || now,
      endsAt: nextEndsAt,
    },
    create: {
      schoolAccountId: input.schoolAccountId,
      planId: plan.id,
      status: "ACTIVE",
      startsAt: now,
      endsAt: nextEndsAt,
    },
  });

  await prisma.manualActivation.create({
    data: {
      schoolAccountId: input.schoolAccountId,
      activatedById: input.activatedById,
      reason: input.reason || `تفعيل لمدة ${durationDays} يوم`,
      startsAt: now,
      endsAt: nextEndsAt,
    },
  });

  return subscription;
}

export async function redeemActivationCode(input: {
  code: string;
  schoolAccountId: string;
  userId: string;
}) {
  const normalizedCode = input.code.trim().toUpperCase();

  const activationCode = await prisma.activationCode.findUnique({
    where: {
      code: normalizedCode,
    },
  });

  if (!activationCode) {
    return {
      ok: false,
      message: "كود التفعيل غير صحيح.",
    };
  }

  if (!activationCode.isActive) {
    return {
      ok: false,
      message: "هذا الكود غير نشط.",
    };
  }

  if (activationCode.expiresAt && activationCode.expiresAt.getTime() < Date.now()) {
    return {
      ok: false,
      message: "انتهت صلاحية هذا الكود.",
    };
  }

  if (activationCode.usedCount >= activationCode.maxUses) {
    return {
      ok: false,
      message: "تم استخدام هذا الكود من قبل.",
    };
  }

  if (
    activationCode.schoolAccountId &&
    activationCode.schoolAccountId !== input.schoolAccountId
  ) {
    return {
      ok: false,
      message: "هذا الكود مخصص لحساب آخر.",
    };
  }

  await activateSchoolAccount({
    schoolAccountId: input.schoolAccountId,
    days: activationCode.durationDays,
    reason: `تفعيل بواسطة الكود ${activationCode.code}`,
  });

  await prisma.activationCode.update({
    where: {
      id: activationCode.id,
    },
    data: {
      usedCount: {
        increment: 1,
      },
      usedByUserId: input.userId,
      schoolAccountId: input.schoolAccountId,
      lastUsedAt: new Date(),
    },
  });

  return {
    ok: true,
    message: `تم تفعيل الحساب لمدة ${activationCode.durationDays} يوم.`,
  };
}

export function createReadableActivationCode(prefix = "RSHD") {
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  const year = new Date().getFullYear();

  return `${prefix}-${year}-${randomPart}`;
}
