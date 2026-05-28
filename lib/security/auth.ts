import "server-only";
import type { UserRole } from "./roles";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string;
  schoolId: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  return {
    id: "dev-user",
    name: "مستخدم التطوير",
    email: "dev@example.com",
    role: "ADMIN",
    tenantId: "default-tenant",
    schoolId: "default-school",
  };
}