import { NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import {
  getSchoolSubscriptionOverview,
  isServiceAllowedForSchool,
} from "@/lib/subscription/subscription-service";

export async function requireActiveSubscriptionApi() {
  const current = await getCurrentSessionUser();

  if (!current?.user?.schoolAccountId) {
    return NextResponse.json(
      {
        error: "يجب تسجيل الدخول أولًا.",
        code: "UNAUTHENTICATED",
      },
      {
        status: 401,
      }
    );
  }

  if (current.user.role === "ADMIN") {
    return null;
  }

  const overview = await getSchoolSubscriptionOverview(
    current.user.schoolAccountId
  );

  if (!overview.usable) {
    return NextResponse.json(
      {
        error: "حسابك يحتاج تفعيلًا للاستمرار في إنشاء الحالات أو التقارير.",
        code: "SUBSCRIPTION_INACTIVE",
        redirectTo: "/dashboard/plans?reason=activation-required",
      },
      {
        status: 402,
      }
    );
  }

  return null;
}

export async function requireServiceAccessApi(serviceSlug: string) {
  const current = await getCurrentSessionUser();

  if (!current?.user?.schoolAccountId) {
    return NextResponse.json(
      {
        error: "يجب تسجيل الدخول أولًا.",
        code: "UNAUTHENTICATED",
      },
      {
        status: 401,
      }
    );
  }

  if (current.user.role === "ADMIN") {
    return null;
  }

  const result = await isServiceAllowedForSchool({
    schoolAccountId: current.user.schoolAccountId,
    serviceSlug,
  });

  if (!result.ok) {
    const reason =
      result.reason === "SUBSCRIPTION_INACTIVE"
        ? "activation-required"
        : "service-not-in-plan";

    return NextResponse.json(
      {
        error:
          result.reason === "SUBSCRIPTION_INACTIVE"
            ? "حسابك يحتاج تفعيلًا للاستمرار."
            : "هذه الخدمة غير مشمولة في باقتك الحالية.",
        code: result.reason,
        serviceSlug,
        redirectTo: `/dashboard/plans?reason=${reason}&service=${encodeURIComponent(
          serviceSlug
        )}`,
      },
      {
        status: 402,
      }
    );
  }

  return null;
}
