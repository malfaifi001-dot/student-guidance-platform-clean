import type { Prisma } from "@prisma/client";

export function assessmentAnalysisOwnershipWhere(
  schoolAccountId: string | null,
  userId: string,
  options?: { historicalPersonalRead?: boolean },
): Prisma.AssessmentAnalysisWhereInput {
  return {
    ...(options?.historicalPersonalRead ? {} : { schoolAccountId }),
    createdById: userId,
  };
}
