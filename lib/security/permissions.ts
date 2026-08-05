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
  "results-analysis:read",
  "results-analysis:create",
  "results-analysis:export",
  "subscription:read",
  "subscription:manage",
  "admin:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const COUNSELOR_PERMISSIONS: Permission[] = [
  "dashboard:read",
  "students:read",
  "students:write",
  "cases:read",
  "cases:create",
  "cases:update",
  "evidence:read",
  "evidence:upload",
  "reports:read",
  "reports:export",
  "results-analysis:read",
  "results-analysis:create",
  "results-analysis:export",
  "subscription:read",
];

const ACTIVITY_LEADER_PERMISSIONS: Permission[] = [
  "dashboard:read",
  "students:read",
  "evidence:read",
  "evidence:upload",
  "reports:read",
  "reports:export",
  "subscription:read",
];

const TEACHER_PERMISSIONS: Permission[] = [
  "dashboard:read",
  "students:read",
  "subscription:read",
];

const PRINCIPAL_PERMISSIONS: Permission[] = ["dashboard:read"];

const STAFF_PERMISSIONS: Permission[] = [
  "dashboard:read",
  "students:read",
  "cases:read",
  "evidence:read",
  "reports:read",
  "results-analysis:read",
  "subscription:read",
];

const SCHOOL_OWNER_PERMISSIONS: Permission[] = [
  ...COUNSELOR_PERMISSIONS,
  "workflows:read",
  "subscription:manage",
];

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [...PERMISSIONS],
  COUNSELOR: COUNSELOR_PERMISSIONS,
  ACTIVITY_LEADER: ACTIVITY_LEADER_PERMISSIONS,
  TEACHER: TEACHER_PERMISSIONS,
  PRINCIPAL: PRINCIPAL_PERMISSIONS,
  SCHOOL_OWNER: SCHOOL_OWNER_PERMISSIONS,
  STAFF: STAFF_PERMISSIONS,
};

export function hasPermission(role: UserRole, permission: Permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getRolePermissions(role: UserRole) {
  return ROLE_PERMISSIONS[role] ?? [];
}
