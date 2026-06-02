import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import {
  getRemainingDays,
  isSubscriptionUsable,
} from "@/lib/subscription/subscription-service";

function getSchoolDisplayName(account: {
  profile?: {
    schoolName?: string | null;
  } | null;
}) {
  const schoolName = String(account.profile?.schoolName || "").trim();
  return schoolName || "هوية المدرسة غير مكتملة";
}

function getComputedStatus(input: {
  subscriptionStatus?: string | null;
  endsAt?: Date | null;
}) {
  if (!input.subscriptionStatus) return "NO_SUBSCRIPTION";

  if (
    input.endsAt &&
    input.endsAt.getTime() <= Date.now() &&
    input.subscriptionStatus !== "CANCELED"
  ) {
    return "EXPIRED";
  }

  return input.subscriptionStatus;
}

export async function GET() {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const [schoolAccounts, plans, pendingRequests] = await Promise.all([
    prisma.schoolAccount.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        profile: true,
        subscription: {
          include: {
            plan: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            officialName: true,
            email: true,
            role: true,
            isActive: true,
          },
          take: 5,
          orderBy: {
            createdAt: "asc",
          },
        },
        _count: {
          select: {
            users: true,
            students: true,
          },
        },
      },
    }),

    prisma.plan.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    }),

    prisma.bankTransferRequest.findMany({
      where: {
        status: "PENDING",
      },
      select: {
        id: true,
        schoolAccountId: true,
        amount: true,
        currency: true,
        createdAt: true,
      },
    }),
  ]);

  const pendingCountBySchool = new Map<string, number>();

  for (const request of pendingRequests) {
    pendingCountBySchool.set(
      request.schoolAccountId,
      (pendingCountBySchool.get(request.schoolAccountId) || 0) + 1
    );
  }

  const subscribers = schoolAccounts.map((account) => {
    const subscription = account.subscription;
    const computedStatus = getComputedStatus({
      subscriptionStatus: subscription?.status,
      endsAt: subscription?.endsAt,
    });

    const remainingDays = getRemainingDays(subscription?.endsAt);
    const usable = isSubscriptionUsable(
      subscription?.status,
      subscription?.endsAt
    );

    const owner =
      account.users.find((user) => user.role !== "ADMIN") || account.users[0];

    return {
      schoolAccountId: account.id,
      accountName: account.name,
      slug: account.slug,
      isActive: account.isActive,
      schoolName: getSchoolDisplayName(account),
      educationDepartment: account.profile?.educationDepartment || "",
      ownerName: owner?.officialName || owner?.name || "غير محدد",
      ownerEmail: owner?.email || "",
      usersCount: account._count.users,
      studentsCount: account._count.students,
      pendingRequestsCount: pendingCountBySchool.get(account.id) || 0,
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            computedStatus,
            startsAt: subscription.startsAt,
            endsAt: subscription.endsAt,
            remainingDays,
            usable,
            planId: subscription.planId,
            planName: subscription.plan?.name || "بدون باقة",
            planSlug: subscription.plan?.slug || "",
          }
        : null,
      computedStatus,
      needsAttention:
        computedStatus === "NO_SUBSCRIPTION" ||
        computedStatus === "EXPIRED" ||
        computedStatus === "CANCELED" ||
        computedStatus === "PAST_DUE" ||
        (remainingDays !== null && remainingDays <= 7) ||
        (pendingCountBySchool.get(account.id) || 0) > 0,
    };
  });

  const stats = {
    total: subscribers.length,
    active: subscribers.filter((item) => item.computedStatus === "ACTIVE").length,
    trial: subscribers.filter((item) => item.computedStatus === "TRIAL").length,
    canceled: subscribers.filter((item) => item.computedStatus === "CANCELED")
      .length,
    expired: subscribers.filter((item) => item.computedStatus === "EXPIRED")
      .length,
    noSubscription: subscribers.filter(
      (item) => item.computedStatus === "NO_SUBSCRIPTION"
    ).length,
    needsAttention: subscribers.filter((item) => item.needsAttention).length,
    pendingRequests: pendingRequests.length,
    totalUsers: subscribers.reduce((sum, item) => sum + item.usersCount, 0),
    totalStudents: subscribers.reduce((sum, item) => sum + item.studentsCount, 0),
  };

  return NextResponse.json({
    stats,
    plans: plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
    })),
    subscribers,
  });
}




