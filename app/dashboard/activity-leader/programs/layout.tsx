import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getDashboardHomePath } from "@/lib/auth/dashboard-redirects";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { requireServiceAccessForCurrentUser } from "@/lib/subscription/subscription-guard";

export default async function ActivityProgramsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const current = await requireDashboardUser();

  if (current.user.role !== "ACTIVITY_LEADER") {
    redirect(getDashboardHomePath(current.user.role));
  }

  await requireServiceAccessForCurrentUser("activity-programs");

  return <>{children}</>;
}