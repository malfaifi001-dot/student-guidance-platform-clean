import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const EXCLUDED_ANALYTICS_PHONE = "0539700055";
const EXCLUSION_LIMIT = 1000;

export type TeachixAnalyticsScope = {
  excludedUserIds: string[];
  includedUserWhere: Prisma.UserWhereInput;
};

export async function createTeachixAnalyticsScope(): Promise<TeachixAnalyticsScope> {
  const excluded = await prisma.user.findMany({
    where: { OR: [{ role: "ADMIN" }, { phone: EXCLUDED_ANALYTICS_PHONE }] },
    select: { id: true },
    take: EXCLUSION_LIMIT + 1,
  });
  if (excluded.length > EXCLUSION_LIMIT) throw new Error("ANALYTICS_EXCLUSION_SCOPE_TOO_LARGE");
  return {
    excludedUserIds: excluded.map((user) => user.id),
    includedUserWhere: { NOT: [{ role: "ADMIN" }, { phone: EXCLUDED_ANALYTICS_PHONE }] },
  };
}

export function excludeUsers<T extends Record<string, unknown>>(where: T, scope: TeachixAnalyticsScope) {
  return { ...where, id: { notIn: scope.excludedUserIds } };
}

export function excludeActors<T extends Record<string, unknown>>(where: T, scope: TeachixAnalyticsScope) {
  return { ...where, actorUserId: { notIn: scope.excludedUserIds } };
}

export function excludeCreators<T extends Record<string, unknown>>(where: T, scope: TeachixAnalyticsScope) {
  return { ...where, createdById: { notIn: scope.excludedUserIds } };
}
