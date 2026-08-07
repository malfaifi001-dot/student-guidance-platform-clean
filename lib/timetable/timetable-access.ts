import "server-only";

import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { requirePrincipalApi } from "@/lib/principal/principal-api-guard";
import { requirePrincipalPage } from "@/lib/principal/principal-page-guard";
import { getSchoolSubscriptionOverview } from "@/lib/subscription/subscription-service";

export async function requireTimetablePageAccess() {
  const access = await requirePrincipalPage();

  if (!access.schoolAccountId) {
    redirect("/dashboard/settings/school");
  }

  return {
    current: access.current,
    user: access.user,
    schoolAccountId: access.schoolAccountId,
  };
}

export async function requireTimetableApiAccess(options?: {
  requireActiveSubscription?: boolean;
}) {
  const access = await requirePrincipalApi({ requireSchool: true });

  if (!access.ok) {
    return access;
  }

  if (options?.requireActiveSubscription) {
    const overview = await getSchoolSubscriptionOverview(
      access.schoolAccountId!,
    );

    if (!overview.usable) {
      return {
        ok: false as const,
        response: NextResponse.json(
          {
            success: false,
            error: "حسابك يحتاج إلى اشتراك نشط للمتابعة.",
            code: "SUBSCRIPTION_INACTIVE",
            redirectTo: "/dashboard/plans?reason=activation-required",
          },
          { status: 402 },
        ),
      };
    }
  }

  return access;
}