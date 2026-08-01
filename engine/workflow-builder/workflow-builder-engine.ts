import { prisma } from "@/lib/prisma";
import { getWorkflowSlotTypeAliases } from "@/lib/workflows/workflow-slot";

export async function getWorkflowBuilderData() {
  const workflows = await prisma.workflow.findMany({
    where: {
      workflowType: { in: getWorkflowSlotTypeAliases("service-main") },
    },
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
