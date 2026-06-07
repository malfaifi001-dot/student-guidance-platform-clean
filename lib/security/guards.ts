import "server-only";

import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import { hasPermission, type Permission } from "./permissions";
import type { UserRole } from "./roles";

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requirePermission(permission: Permission) {
  const user = await requireUser();

  if (!hasPermission(user.role, permission)) {
    notFound();
  }

  return user;
}

export async function requireRole(roles: UserRole | UserRole[]) {
  const user = await requireUser();
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  if (!allowedRoles.includes(user.role)) {
    notFound();
  }

  return user;
}

export async function requireAdmin() {
  return requireRole("ADMIN");
}

export function denyIfMissing(value: unknown) {
  if (!value) notFound();
}
