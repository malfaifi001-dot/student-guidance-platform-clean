import "server-only";

import { redirect } from "next/navigation";
import { requirePrincipalApi } from "@/lib/principal/principal-api-guard";
import { requirePrincipalPage } from "@/lib/principal/principal-page-guard";

export async function requireTimetablePageAccess() {
  const access = await requirePrincipalPage();

  if (!access.schoolAccountId) {
    redirect("/dashboard/settings/school");
  }

  return {
    current: access.current,
    user: access.user,
    schoolAccountId: access.schoolAccountId,
  };
}

export async function requireTimetableApiAccess() {
  return requirePrincipalApi({ requireSchool: true });
}