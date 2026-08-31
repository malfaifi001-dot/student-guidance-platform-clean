import "server-only";

import { prisma } from "@/lib/prisma";

export type AccountabilityInboxContext = {
  user: { id: string };
  schoolAccountId: string;
};

export async function listAccountabilityInboxRequests(context: AccountabilityInboxContext) {
  return prisma.accountabilityRequest.findMany({
    where: {
      schoolAccountId: context.schoolAccountId,
      respondentUserId: context.user.id,
    },
    orderBy: [{ sentAt: "desc" }, { updatedAt: "desc" }],
    take: 100,
    select: {
      title: true,
      status: true,
      token: true,
      sentAt: true,
      respondedAt: true,
      returnedReason: true,
      createdBy: { select: { name: true, officialName: true } },
    },
  });
}
