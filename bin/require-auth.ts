import { NextResponse } from "next/server";
import {
  requireSchoolDashboardApiContext,
  type SchoolDashboardContext,
} from "@/lib/auth/dashboard-context";
import {
  getSchoolSubscriptionOverview,
  isServiceAllowedForSchool,
} from "@/lib/subscription/subscription-service";

type DashboardAuthResult = SchoolDashboardContext | NextResponse;

function buildSubscriptionRequiredResponse() {
  return NextResponse.json(
    {
      success: false,
      error: "حسابك يحتاج إلى اشتراك نشط للمتابعة.",
      code: "SUBSCRIPTION_INACTIVE",
      redirectTo: "/dashboard/plans?reason=activation-required",
    },
    { status: 402 },
  );
}

export async function requireActiveSubscriptionForCurrentUser(): Promise<DashboardAuthResult> {
  const context = await requireSchoolDashboardApiContext();

  if (context instanceof Response) {
    return context;
  }

  if (context.isAdmin) {
    return context;
  }

  const overview = await getSchoolSubscriptionOverview(context.schoolAccountId);

  if (!overview.usable) {
    return buildSubscriptionRequiredResponse();
  }

  return context;
}

export async function requireServiceAccessForCurrentUser(
  serviceSlug: string,
): Promise<DashboardAuthResult> {
  const context = await requireActiveSubscriptionForCurrentUser();

  if (context instanceof Response) {
    return context;
  }

  if (context.isAdmin) {
    return context;
  }

  const result = await isServiceAllowedForSchool({
    schoolAccountId: context.schoolAccountId,
    serviceSlug,
  });

  if (!result.ok) {
    const reason =
      result.reason === "SUBSCRIPTION_INACTIVE"
        ? "activation-required"
        : "service-not-in-plan";

    return NextResponse.json(
      {
        success: false,
        error:
          result.reason === "SUBSCRIPTION_INACTIVE"
            ? "حسابك يحتاج إلى اشتراك نشط للمتابعة."
            : "هذه الخدمة غير مفعلة في باقتك الحالية.",
        code: result.reason,
        serviceSlug,
        redirectTo: `/dashboard/plans?reason=${reason}&service=${encodeURIComponent(serviceSlug)}`,
      },
      { status: 402 },
    );
  }

  return context;
}
