import "server-only";

import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/auth/current-user";

export type MobileRole =
  | "ADMIN"
  | "COUNSELOR"
  | "ACTIVITY_LEADER"
  | "TEACHER"
  | "PRINCIPAL"
  | "SCHOOL_OWNER"
  | "STAFF";

const MOBILE_DESTINATIONS: Record<MobileRole, string> = {
  COUNSELOR: "/mobile/counselor",
  ACTIVITY_LEADER: "/mobile/activity-leader",
  TEACHER: "/mobile/teacher",
  PRINCIPAL: "/mobile/principal",
  ADMIN: "/mobile/unavailable?role=ADMIN",
  SCHOOL_OWNER: "/mobile/unavailable?role=SCHOOL_OWNER",
  STAFF: "/mobile/unavailable?role=STAFF",
};

export function normalizeMobileRole(role: unknown): MobileRole | null {
  const normalized = typeof role === "string" ? role.trim().toUpperCase() : "";
  return normalized in MOBILE_DESTINATIONS
    ? normalized as MobileRole
    : null;
}

export function getMobileDestination(role: unknown) {
  const normalized = normalizeMobileRole(role);
  return normalized ? MOBILE_DESTINATIONS[normalized] : "/mobile/unavailable";
}

function mobileLoginPath(pathname: string) {
  const next = pathname.startsWith("/mobile") ? pathname : "/mobile";
  return `/login?next=${encodeURIComponent(next)}`;
}

export async function requireMobileUser(pathname = "/mobile") {
  const current = await getCurrentSessionUser();

  if (!current) {
    redirect(mobileLoginPath(pathname));
  }

  return current;
}

export async function requireMobileRole(
  role: MobileRole,
  pathname: string,
) {
  const current = await requireMobileUser(pathname);
  const currentRole = normalizeMobileRole(current.user.role);

  if (currentRole !== role) {
    redirect(getMobileDestination(currentRole));
  }

  return current;
}
