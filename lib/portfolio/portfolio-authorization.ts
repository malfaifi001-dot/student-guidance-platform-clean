import type { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type PortfolioActor = {
  id: string;
  role?: UserRole | string | null;
  schoolAccountId?: string | null;
};

export class PortfolioServiceError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const PORTFOLIO_ACTOR_ROLES = new Set<UserRole>([
  "TEACHER",
  "COUNSELOR",
  "ACTIVITY_LEADER",
  "PRINCIPAL",
  "SCHOOL_OWNER",
  "STAFF",
]);

export function assertPortfolioActor(user: PortfolioActor): asserts user is PortfolioActor & { role: UserRole; schoolAccountId: string } {
  if (!user.role || !PORTFOLIO_ACTOR_ROLES.has(user.role as UserRole)) {
    throw new PortfolioServiceError(403, "هذه الخدمة غير متاحة لهذا الحساب.");
  }
  if (!user.schoolAccountId) {
    throw new PortfolioServiceError(400, "حساب المدرسة غير مكتمل.");
  }
}

export async function requireOwnedPortfolio(user: PortfolioActor, portfolioId: string) {
  assertPortfolioActor(user);

  const portfolio = await prisma.achievementPortfolio.findFirst({
    where: {
      id: portfolioId,
      ownerUserId: user.id,
      schoolAccountId: user.schoolAccountId,
      roleKey: user.role,
    },
  });

  if (!portfolio) {
    throw new PortfolioServiceError(404, "ملف الإنجاز غير موجود أو لا تملك صلاحية الوصول إليه.");
  }

  return portfolio;
}
