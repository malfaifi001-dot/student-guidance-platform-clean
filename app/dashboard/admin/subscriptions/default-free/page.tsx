import { AdminDefaultFreePlanPage } from "@/components/subscription/admin-default-free-plan-page";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { redirect } from "next/navigation";

export default async function AdminDefaultFreeSubscriptionPage() {
  const current = await requireDashboardUser();

  if (current.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return <AdminDefaultFreePlanPage />;
}
