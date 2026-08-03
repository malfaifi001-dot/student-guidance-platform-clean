import type { Prisma } from "@prisma/client";
import { buildCaseEntryPermissionWhere } from "@/lib/cases/case-permissions";

type CaseScopeUser = {
  id: string;
  role: string;
  schoolAccountId?: string | null;
  email?: string | null;
};

export function buildCaseEntryWhereForUser(
  user: CaseScopeUser,
): Prisma.CaseEntryWhereInput {
  return buildCaseEntryPermissionWhere(user);
}

export function getCaseCenterScopeLabel(role: string) {
  if (role === "ADMIN") return "كل الحالات";
  if (role === "ACTIVITY_LEADER") return "حالات برامج النشاط";
  if (role === "COUNSELOR") return "حالات المدرسة";
  if (role === "SCHOOL_OWNER") return "حالات المدرسة";
  if (role === "STAFF") return "الحالات المرتبطة بك";

  return "الحالات المتاحة";
}
