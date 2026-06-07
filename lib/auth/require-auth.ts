import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/auth/current-user";

export async function requireDashboardUser() {
  const current = await getCurrentSessionUser();

  if (!current) {
    redirect("/login");
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
