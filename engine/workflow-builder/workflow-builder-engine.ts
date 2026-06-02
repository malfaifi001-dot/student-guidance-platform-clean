import { prisma } from "@/lib/prisma";
import { WORKFLOW_TYPES } from "@/lib/workflows/workflow-types";

export async function getWorkflowBuilderData() {
  const workflows = await prisma.workflow.findMany({
    where: {
      workflowType: WORKFLOW_TYPES.DEFAULT,
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
