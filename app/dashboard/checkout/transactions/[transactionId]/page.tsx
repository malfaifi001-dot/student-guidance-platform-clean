import { redirect } from "next/navigation";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { getDashboardHomePath } from "@/lib/auth/dashboard-redirects";

export default async function CheckoutTransactionRoutePage() {
  const current = await requireDashboardUser();
  redirect(getDashboardHomePath(current.user.role));
}
