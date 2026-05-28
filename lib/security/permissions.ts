import type { UserRole } from "./roles";

export const PERMISSIONS = [
  "dashboard:read",
  "students:read",
  "students:write",
  "workflows:read",
  "workflows:write",
  "cases:read",
  "cases:create",
  "cases:update",
  "cases:close",
  "evidence:read",
  "evidence:upload",
  "reports:read",
  "reports:export",
  "admin:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [...PERMISSIONS],
  SCHOOL_ADMIN: [
    "dashboard:read",
    "students:read",
    "students:write",
    "workflows:read",
    "workflows:write",
    "cases:read",
    "cases:create",
    "cases:update",
    "cases:close",
    "evidence:read",
    "evidence:upload",
    "reports:read",
    "reports:export",
  ],
  COUNSELOR: [
    "dashboard:read",
    "students:read",
    "cases:read",
    "cases:create",
    "cases:update",
    "evidence:read",
    "evidence:upload",
    "reports:read",
    "reports:export",
  ],
  VIEWER: ["dashboard:read", "students:read", "cases:read", "evidence:read", "reports:read"],
};

export function hasPermission(role: UserRole, permission: Permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}