export const USER_ROLES = [
  "ADMIN",
  "COUNSELOR",
  "ACTIVITY_LEADER",
  "TEACHER",
  "SCHOOL_OWNER",
  "STAFF",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
}

export function toUserRole(value: unknown): UserRole | null {
  return isUserRole(value) ? value : null;
}

export function isAdminRole(role?: string | null) {
  return role === "ADMIN";
}

export function isSchoolScopedRole(role?: string | null) {
  return (
    role === "COUNSELOR" ||
    role === "ACTIVITY_LEADER" ||
    role === "TEACHER" ||
    role === "SCHOOL_OWNER" ||
    role === "STAFF"
  );
}
