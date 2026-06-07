import { NextResponse } from "next/server";
import { getActivationOverview } from "@/lib/activation/activation-service";
import { getCurrentSessionUser } from "@/lib/auth/current-user";

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

  const overview = await getActivationOverview(current.user.schoolAccountId);

  return NextResponse.json({
    subscription: {
      status: overview.subscription.status,
      startsAt: overview.subscription.startsAt,
      endsAt: overview.subscription.endsAt,
      planName: overview.subscription.plan?.name || "تفعيل الموجه",
    },
    pendingBankRequests: overview.pendingBankRequests,
    remainingDays: overview.remainingDays,
    usable: overview.usable,
  });
}
