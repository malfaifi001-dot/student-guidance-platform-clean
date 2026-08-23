import { redirect } from "next/navigation";

import { SupportHelpPage } from "@/components/support/support-help-page";
import { getDashboardHomePath } from "@/lib/auth/dashboard-redirects";
import { requireDashboardUser } from "@/lib/auth/require-auth";

export default async function SupportPage() {
  const current = await requireDashboardUser();

  if (current.user.role === "ADMIN") {
    redirect(getDashboardHomePath(current.user.role));
  }

  return <SupportHelpPage />;
}
