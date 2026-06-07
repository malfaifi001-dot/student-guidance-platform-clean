import "server-only";

import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { toUserRole, type UserRole } from "./roles";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;

  /**
   * Legacy compatibility:
   * tenantId/schoolId are kept so old helpers do not break.
   * New code should use schoolAccountId.
   */
  tenantId: string | null;
  schoolId: string | null;
  schoolAccountId: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const current = await getCurrentSessionUser();
  const user = current?.user;

  if (!user) {
    return null;
  }

  const role = toUserRole(user.role);

  if (!role) {
    return null;
  }

  const schoolAccountId = user.schoolAccountId || null;

  return {
    id: user.id,
    name: user.name || user.officialName || user.email,
    email: user.email,
    role,
    tenantId: schoolAccountId,
    schoolId: schoolAccountId,
    schoolAccountId,
  };
}
