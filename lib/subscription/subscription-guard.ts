import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import {
  getUserSubscriptionOverview,
  isServiceAllowedForUser,
} from "@/lib/subscription/subscription-service";
import { isBagModeForCurrentUser } from "@/lib/sales/sales-experience";

export async function requireActiveSubscriptionForCurrentUser() {
  const current = await getCurrentSessionUser();

  if (!current?.user) {
    redirect("/login");
  }

  if (current.user.role === "ADMIN") {
    return current;
  }

  if (await isBagModeForCurrentUser()) {
    return current;
  }

  if (!current.user.schoolAccountId) {
    redirect("/login");
  }

  const overview = await getUserSubscriptionOverview(current.user.id);

  if (!overview.usable) {
    redirect("/dashboard/plans?reason=activation-required");
  }

  return current;
}

export async function requireServiceAccessForCurrentUser(
  serviceSlug: string,
) {
  const current = await getCurrentSessionUser();

  if (!current?.user) {
    redirect("/login");
  }

  if (current.user.role === "ADMIN") {
    return current;
  }

  if (await isBagModeForCurrentUser()) {
    return current;
  }

  if (!current.user.schoolAccountId) {
    redirect("/login");
  }

  const result = await isServiceAllowedForUser({
    userId: current.user.id,
    schoolAccountId: current.user.schoolAccountId,
    serviceSlug,
  });

  if (!result.ok) {
    const reason =
      result.reason === "SUBSCRIPTION_INACTIVE"
        ? "activation-required"
        : "service-not-in-plan";

    redirect(
      `/dashboard/plans?reason=${reason}&service=${encodeURIComponent(
        serviceSlug,
      )}`,
    );
  }

  return current;
}

export async function requireCanCreateInServiceForCurrentUser(
  serviceSlug: string,
) {
  await requireActiveSubscriptionForCurrentUser();

  return requireServiceAccessForCurrentUser(
    serviceSlug,
  );
}
