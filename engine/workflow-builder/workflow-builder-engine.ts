import { prisma } from "@/lib/prisma";

export async function getWorkflowBuilderData() {
  const workflows = await prisma.workflow.findMany({
    include: {
      service: true,
      steps: {
        include: {
          fields: {
            include: {
              options: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return workflows;
}