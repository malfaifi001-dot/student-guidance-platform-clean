import { AdminSubscriptionsControlCenter } from "@/components/subscription/admin-subscriptions-control-center";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { redirect } from "next/navigation";

export default async function AdminSubscriptionsPage() {
  const current = await requireDashboardUser();

  if (current.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return <AdminSubscriptionsControlCenter />;
}
