import type { Prisma } from "@prisma/client";

import {
  getWorkflowActivationSlot,
  getWorkflowSlotTypeAliases,
} from "@/lib/workflows/workflow-slot";

export function buildActiveWorkflowSlotQuery(input: {
  serviceId: string;
  workflowType?: string | null;
}) {
  const workflowType = input.workflowType ?? "service-main";
  const activeKey = getWorkflowActivationSlot({
    serviceId: input.serviceId,
    workflowType,
  });
  const aliases = getWorkflowSlotTypeAliases(workflowType);

  const where: Prisma.WorkflowWhereInput = {
    serviceId: input.serviceId,
    isActive: true,
    status: "ACTIVE",
    OR: [
      { activeKey },
      { activeKey: null, workflowType: { in: aliases } },
    ],
  };
  const orderBy: Prisma.WorkflowOrderByWithRelationInput[] = [
    { activeKey: "desc" },
    { version: "desc" },
    { updatedAt: "desc" },
    { id: "desc" },
  ];

  return {
    where,
    orderBy,
  };
}

export type WorkflowInvariantIssue = {
  code:
    | "MULTIPLE_ACTIVE_WORKFLOWS"
    | "ACTIVE_KEY_MISSING"
    | "INACTIVE_KEY_PRESENT"
    | "ACTIVE_KEY_MISMATCH"
    | "STATUS_FLAG_MISMATCH";
  workflowIds: string[];
  slot: string;
};

export function validateWorkflowActivationInvariants(
  workflows: Array<{
    id: string;
    serviceId: string;
    workflowType: string;
    status: string;
    isActive: boolean;
    activeKey: string | null;
  }>,
) {
  const issues: WorkflowInvariantIssue[] = [];
  const activeBySlot = new Map<string, string[]>();

  for (const workflow of workflows) {
    const expectedKey = getWorkflowActivationSlot(workflow);
    const logicallyActive = workflow.isActive || workflow.status === "ACTIVE";

    if (logicallyActive) {
      activeBySlot.set(expectedKey, [...(activeBySlot.get(expectedKey) ?? []), workflow.id]);
    }
    if (workflow.isActive && !workflow.activeKey) {
      issues.push({ code: "ACTIVE_KEY_MISSING", workflowIds: [workflow.id], slot: expectedKey });
    }
    if (!workflow.isActive && workflow.activeKey) {
      issues.push({ code: "INACTIVE_KEY_PRESENT", workflowIds: [workflow.id], slot: expectedKey });
    }
    if (workflow.activeKey && workflow.activeKey !== expectedKey) {
      issues.push({ code: "ACTIVE_KEY_MISMATCH", workflowIds: [workflow.id], slot: expectedKey });
    }
    if (workflow.isActive !== (workflow.status === "ACTIVE")) {
      issues.push({ code: "STATUS_FLAG_MISMATCH", workflowIds: [workflow.id], slot: expectedKey });
    }
  }

  for (const [slot, workflowIds] of activeBySlot) {
    if (workflowIds.length > 1) {
      issues.push({ code: "MULTIPLE_ACTIVE_WORKFLOWS", workflowIds, slot });
    }
  }
  return issues;
}
