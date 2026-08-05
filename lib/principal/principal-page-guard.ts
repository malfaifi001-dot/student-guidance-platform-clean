import { redirect } from "next/navigation";

import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { getDashboardHomePath } from "@/lib/auth/dashboard-redirects";

export async function requirePrincipalPage() {
  const current = await getCurrentSessionUser();

  if (!current?.user) {
    redirect("/login");
  }

  if (current.user.role !== "PRINCIPAL") {
    redirect(getDashboardHomePath(current.user.role));
  }

  return {
    current,
    user: current.user,
    schoolAccountId: current.user.schoolAccountId ?? null,
  };
}
