import type { Prisma } from "@prisma/client";

export function assessmentAnalysisOwnershipWhere(
  schoolAccountId: string | null,
  userId: string,
): Prisma.AssessmentAnalysisWhereInput {
  return {
    schoolAccountId,
    createdById: userId,
  };
}
