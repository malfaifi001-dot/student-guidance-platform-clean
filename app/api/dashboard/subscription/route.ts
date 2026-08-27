import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import {
  assignDefaultFreePlanIfEligible,
  DEFAULT_FREE_PLAN_SLUG,
} from "@/lib/subscription/default-free-plan";
import { getUserSubscriptionOverview } from "@/lib/subscription/subscription-service";

export async function GET() {
  const current = await getCurrentSessionUser();

  if (!current?.user?.schoolAccountId) {
    return NextResponse.json(
      {
        error: "يجب تسجيل الدخول أولًا.",
      },
      {
        status: 401,
      },
    );
  }

  if (current.user.role !== "ADMIN") {
    try {
      await assignDefaultFreePlanIfEligible({
        schoolAccountId: current.user.schoolAccountId,
        userId: current.user.id,
        source: "subscription-overview",
      });
    } catch (error) {
      console.error("SUBSCRIPTION_OVERVIEW_DEFAULT_FREE_PLAN_ERROR", error);
    }
  }

  const [overview, pendingBankRequests] = await Promise.all([
    getUserSubscriptionOverview(current.user.id),
    prisma.bankTransferRequest.count({
      where: {
        schoolAccountId: current.user.schoolAccountId,
        requesterUserId: current.user.id,
        status: "PENDING",
      },
    }),
  ]);

  return NextResponse.json({
    subscription: overview.subscription
      ? {
          status: overview.subscription.status,
          startsAt: overview.subscription.startsAt,
          endsAt: overview.subscription.endsAt,
          planSlug: overview.subscription.plan?.slug || null,
          planName:
            overview.subscription.plan?.slug === DEFAULT_FREE_PLAN_SLUG
              ? "الباقة التلقائية"
              : overview.subscription.plan?.name || "تفعيل تلقائي",
        }
      : null,
    pendingBankRequests,
    remainingDays: overview.remainingDays,
    usable: overview.usable,
  });
}
