import { redirect } from "next/navigation";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function SubscriptionPage() {
  await requireDashboardUser();

  redirect("/dashboard/plans");
}
