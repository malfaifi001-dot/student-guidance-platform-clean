import { prisma } from "@/lib/prisma";

export type PortfolioActor = {
  id: string;
  role?: string | null;
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

export function assertTeacherActor(user: PortfolioActor) {
  if (user.role !== "TEACHER") {
    throw new PortfolioServiceError(403, "هذه الخدمة متاحة للمعلم فقط.");
  }
  if (!user.schoolAccountId) {
    throw new PortfolioServiceError(400, "حساب المدرسة غير مكتمل.");
  }
}

export async function requireOwnedPortfolio(user: PortfolioActor, portfolioId: string) {
  assertTeacherActor(user);

  const portfolio = await prisma.achievementPortfolio.findFirst({
    where: {
      id: portfolioId,
      ownerUserId: user.id,
      schoolAccountId: user.schoolAccountId!,
      roleKey: "TEACHER",
    },
  });

  if (!portfolio) {
    throw new PortfolioServiceError(404, "ملف الإنجاز غير موجود أو لا تملك صلاحية الوصول إليه.");
  }

  return portfolio;
}
