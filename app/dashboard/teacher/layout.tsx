import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { getDashboardHomePath } from "@/lib/auth/dashboard-redirects";

export default async function TeacherDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const current = await requireDashboardUser();

  if (current.user.role !== "TEACHER" && current.user.role !== "ADMIN") {
    redirect(getDashboardHomePath(current.user.role));
  }

  return <>{children}</>;
}
