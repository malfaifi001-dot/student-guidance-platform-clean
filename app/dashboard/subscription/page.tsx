import { requireDashboardUser } from "@/lib/auth/require-auth";
import { getDashboardHomePath } from "@/lib/auth/dashboard-redirects";
import { redirect } from "next/navigation";

export default async function SubscriptionPage() {
  const current = await requireDashboardUser();
  redirect(getDashboardHomePath(current.user.role));
}
