import "server-only";

import { NextResponse } from "next/server";

import type { DashboardContext } from "@/lib/auth/dashboard-context";

const STATISTICS_ALLOWED_ROLES = new Set([
  "ADMIN",
  "COUNSELOR",
  "TEACHER",
]);

export function canAccessStatistics(context: DashboardContext) {
  return STATISTICS_ALLOWED_ROLES.has(context.user.role);
}

export function requireStatisticsRole(
  context: DashboardContext,
): NextResponse | null {
  if (canAccessStatistics(context)) {
    return null;
  }

  return NextResponse.json(
    {
      success: false,
      error: "لا تملك صلاحية الوصول إلى خدمة الإحصائيات.",
      code: "STATISTICS_ROLE_FORBIDDEN",
    },
    {
      status: 403,
    },
  );
}
