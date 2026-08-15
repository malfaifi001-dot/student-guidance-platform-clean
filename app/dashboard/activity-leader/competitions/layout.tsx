import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { STUDENT_ACTIVITY_COMPETITIONS_SERVICE_SLUG } from "@/lib/activity-competitions/activity-competitions-service";
import { getDashboardHomePath } from "@/lib/auth/dashboard-redirects";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { requireServiceAccessForCurrentUser } from "@/lib/subscription/subscription-guard";

export default async function ActivityCompetitionsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const current = await requireDashboardUser();

  if (current.user.role !== "ACTIVITY_LEADER") {
    redirect(getDashboardHomePath(current.user.role));
  }

  await requireServiceAccessForCurrentUser(
    STUDENT_ACTIVITY_COMPETITIONS_SERVICE_SLUG,
  );

  return <>{children}</>;
}
