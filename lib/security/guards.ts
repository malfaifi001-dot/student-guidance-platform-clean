import "server-only";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import { hasPermission, type Permission } from "./permissions";

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

export function denyIfMissing(value: unknown) {
  if (!value) notFound();
}