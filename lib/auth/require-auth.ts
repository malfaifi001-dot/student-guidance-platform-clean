import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { getSafeTeachixDashboardRoute } from "@/lib/deep-links/teachix-deep-link";

export async function requireDashboardUser() {
  const current = await getCurrentSessionUser();

  if (!current) {
    const requestedPath = (await headers()).get("x-teachix-requested-path");
    const safeNextPath = getSafeTeachixDashboardRoute(requestedPath);
    redirect(safeNextPath ? `/login?next=${encodeURIComponent(safeNextPath)}` : "/login");
  }

  return current;
}

export async function requireCompletedOnboarding() {
  const current = await requireDashboardUser();

  if (!current.user.onboardingCompleted) {
    redirect("/dashboard/onboarding?required=true");
  }

  return current;
}
