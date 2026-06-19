import { redirect } from "next/navigation";

import { MobileNewCaseServices } from "@/components/mobile/mobile-new-case-services";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";

export default async function MobileNewCasePage() {
  const context = await requireDashboardPageContext();

  if (!context.isAdmin && !context.schoolAccountId) {
    redirect("/dashboard/onboarding?required=true");
  }

  return <MobileNewCaseServices />;
}