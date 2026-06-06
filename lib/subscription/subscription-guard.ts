import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import {
  getSchoolSubscriptionOverview,
  isServiceAllowedForSchool,
} from "@/lib/subscription/subscription-service";

export async function requireActiveSubscriptionForCurrentUser() {
  const current = await getCurrentSessionUser();

  if (!current?.user?.schoolAccountId) {
    redirect("/login");
  }

  if (current.user.role === "ADMIN") {
    return current;
  }

  const overview = await getSchoolSubscriptionOverview(
    current.user.schoolAccountId
  );

  if (!overview.usable) {
    redirect("/dashboard/plans?reason=activation-required");
  }

  return current;
}

export async function requireServiceAccessForCurrentUser(serviceSlug: string) {
  const current = await getCurrentSessionUser();

  if (!current?.user?.schoolAccountId) {
    redirect("/login");
  }

  if (current.user.role === "ADMIN") {
    return current;
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

    redirect(
      `/dashboard/subscription?reason=${reason}&service=${encodeURIComponent(
        serviceSlug
      )}`
    );
  }

  return current;
}

export async function requireCanCreateInServiceForCurrentUser(
  serviceSlug: string
) {
  await requireActiveSubscriptionForCurrentUser();
  return requireServiceAccessForCurrentUser(serviceSlug);
}
